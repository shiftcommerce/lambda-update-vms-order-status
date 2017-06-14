// @flow

import fetch from 'node-fetch'

type DMSWebhook = {
  ConsignmentReference: string,
  ConsignmentState: string
}

// AWS Lambda will call this method
exports.process = async (event: DMSWebhook, context: {}, callback: (Error | null, any) => void) => {

  try { 
    const authenticationHeaders = {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      'X-Auth-Token': process.env.API_KEY
    }

    const consignmentReference = event.ConsignmentReference;
    const newStatus = toHumanReadable(event.ConsignmentState);

    function toHumanReadable(status) {
      let words = status.match(/^[a-z]+|[A-Z][a-z]*/g)
      if (!words) {
        callback(new Error('ConsignmentState is invalid'))
        return 
      }

      let readableStatus = words.map(word => word.toLowerCase()).join(' ');
      return readableStatus[0].toUpperCase() + readableStatus.slice(1);
    }

    if (!process.env.VMS_HOST) throw new Error('VMS_HOST is missing')
    const orderResponse = await fetch(`${process.env.VMS_HOST}/api/v1/orders?filter[consignment_reference]=${consignmentReference}`, {
      headers: authenticationHeaders
    })

    if (!process.env.VMS_HOST) throw new Error('VMS_HOST is missing')
    const returnResponse = await fetch(`${process.env.VMS_HOST}/api/v1/admin/returns?filter[dms_reference]=${consignmentReference}`, {
      header: authenticationHeaders
    })

    if (orderResponse.status != 200) {
      callback(new Error(`Filtering orders by consignment reference failed. VMS responded with status ${orderResponse.status}: ${JSON.stringify(orderResponse)}`))
      return
    } 
    
    if (returnResponse.status != 200) {
      callback(new Error(`Filtering returns by consignment reference failed. VMS responded with status ${returnResponse.status}: ${JSON.stringify(returnResponse)}`))
      return
    }

    const orderResponseJson = await orderResponse.json()
    const returnResponseJson = await returnResponse.json()

    const updateOrderResponse = await updateOrder(orderResponseJson)
    const updateReturnResponse = await updateReturn(returnResponseJson)

    callback(null, updateOrderResponse)
  
    async function updateOrder (json) {
      if (json.data.length === 0) {
        console.log(`Order with DMS reference ${consignmentReference} does not exist. Skipping execution.`)
        return {}
      }

      let orderId = json.data[0].id;

      let requestBody = {
        data: {
          id: orderId,
          type: "orders",
          attributes: {
            "dms-status": newStatus
          }
        }
      };

      if (!process.env.VMS_HOST) throw new Error('VMS_HOST is missing')
      const response = await fetch(`${process.env.VMS_HOST}/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: authenticationHeaders
      })

      if (response.status != 200) {
        throw new Error(`Updating order status failed. VMS responded with status ${response.status}: ${JSON.stringify(response)}`)
      } else {
        return response.json()
      }
    }

    async function updateReturn (json) {
      if (json.data.length === 0) {
        console.log(`Return with DMS reference ${consignmentReference} does not exist. Skipping execution.`)
        return {}
      }

      let returnId = json.data[0].id;

      let requestBody = {
        data: {
          id: returnId,
          type: "returns",
          attributes: {
            "dms-status": newStatus
          }
        }
      };

      if (!process.env.VMS_HOST) throw new Error('VMS_HOST is missing')
      const response = await fetch(`${process.env.VMS_HOST}/api/v1/admin/returns/${returnId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: authenticationHeaders
      })
        
      if (response.status != 200) {
        throw new Error(`Updating return status failed. VMS responded with status ${response.status}: ${response}`)
      } else {
        return await response.json()
      }
    }
  } catch(e) {
    callback(e)
  }
}

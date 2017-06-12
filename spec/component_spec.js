"use strict";

const component = require('../build/component').process
const nock = require('nock')

nock.disableNetConnect()

// console.log = () => {}

// fixtures
const input = require('./fixtures/input.json')
const filterOrdersResponse = require('./fixtures/filterOrdersResponse.json')
const filterOrdersEmptyResponse = require('./fixtures/filterOrdersEmptyResponse.json')
const filterReturnsResponse = require('./fixtures/filterReturnsResponse.json')
const updateOrderRequest = require('./fixtures/updateOrderRequest.json')
const updateReturnRequest = require('./fixtures/updateReturnRequest.json')
const updateOrderResponse = require('./fixtures/updateOrderResponse.json')
const updateReturnResponse = require('./fixtures/updateReturnResponse.json')

describe('Updating order and return statuses', () => {
  beforeEach(() => {
    process.env.VMS_HOST = 'https://vendors-staging.herokuapp.com',
    process.env.VMS_API_KEY = 'abc123'
  });

  describe('Successful order update', () => {
    beforeEach((done) => {
      this.event = input
      this.callback = () => { done() }
      spyOn(this, 'callback').and.callThrough()

      this.filterOrdersRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/orders?filter[consignment_reference]=EC-000-00A-K9G')
          .reply(200, filterOrdersResponse)

      this.filterReturnsRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/admin/returns?filter[dms_reference]=EC-000-00A-K9G')
          .reply(200, {data: []})

      this.updateOrderRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .patch('/api/v1/orders/123', updateOrderRequest)
          .reply(200, updateOrderResponse)

      component(this.event, this.context, this.callback)
    })

    it("Fetches orders by consignment reference", () => {
      expect(this.filterOrdersRequest.isDone()).toEqual(true)
    })

    it("Update the order status", () => {
      expect(this.updateOrderRequest.isDone()).toEqual(true)
    })

    it("Emits order data", () => {
      expect(this.callback).toHaveBeenCalledTimes(1)

      const error = this.callback.calls.argsFor(0)[0]
      const payload = this.callback.calls.argsFor(0)[1]
      expect(error).toBeNull()
      expect(payload.data.id).toEqual('123')
    })
  })

  describe("Successful return update", () => {
    beforeEach((done) => {
      this.event = input
      this.callback = () => { done() }
      spyOn(this, 'callback').and.callThrough()

      this.filterOrdersRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/orders?filter[consignment_reference]=EC-000-00A-K9G')
          .reply(200, {data: []})

      this.filterReturnsRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/admin/returns?filter[dms_reference]=EC-000-00A-K9G')
          .reply(200, filterReturnsResponse)

      this.updateOrderRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .patch('/api/v1/admin/returns/51', updateReturnRequest)
          .reply(200, updateReturnResponse)

      component(this.event, this.context, this.callback)
    })

    it("Fetches orders by consignment reference", () => {
      expect(this.filterOrdersRequest.isDone()).toEqual(true)
    })

    it("Update the order status", () => {
      expect(this.updateOrderRequest.isDone()).toEqual(true)
    })

    it("Emits empty data", () => {
      expect(this.callback).toHaveBeenCalledTimes(1)

      const error = this.callback.calls.argsFor(0)[0]
      const payload = this.callback.calls.argsFor(0)[1]
      expect(error).toBeNull()
      expect(payload).toEqual({})
    })
  })

  describe("Failed order update", () => {
    beforeEach((done) => {
      this.event = input
      this.callback = () => { done() }
      spyOn(this, 'callback').and.callThrough()

      this.filterOrdersRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/orders?filter[consignment_reference]=EC-000-00A-K9G')
          .reply(200, filterOrdersResponse)

      this.filterReturnsRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/admin/returns?filter[dms_reference]=EC-000-00A-K9G')
          .reply(200, {data: []})

      this.updateOrderRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .patch('/api/v1/orders/123', updateOrderRequest)
          .reply(500)

      component(this.event, this.msg, this.callback)
    })

    it("Emits error", () => {
      expect(this.callback).toHaveBeenCalledTimes(1)

      const error = this.callback.calls.argsFor(0)[0]
      const payload = this.callback.calls.argsFor(0)[1]
      expect(error).not.toBeNull()
      expect(payload).toEqual(undefined)
    })
  })

  describe("When order and return do not exist", () => {
    beforeEach((done) => {
      this.event = input
      this.callback = () => { done() }
      spyOn(this, 'callback').and.callThrough()

      this.filterOrdersRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/orders?filter[consignment_reference]=EC-000-00A-K9G')
          .reply(200, filterOrdersEmptyResponse)

      this.filterReturnsRequest = nock('https://vendors-staging.herokuapp.com', {"encodedQueryParams":true})
          .get('/api/v1/admin/returns?filter[dms_reference]=EC-000-00A-K9G')
          .reply(200, {data: []})

      component(this.event, this.msg, this.callback)
    })

    it("Fetches orders by consignment reference", () => {
      expect(this.filterOrdersRequest.isDone()).toEqual(true)
    })

    it("Emits empty data", () => {
      expect(this.callback).toHaveBeenCalledTimes(1)

      const error = this.callback.calls.argsFor(0)[0]
      const payload = this.callback.calls.argsFor(0)[1]
      expect(error).toBeNull()
      expect(payload).toEqual({})
    })
  })
})

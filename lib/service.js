'use strict'

var os = require('os')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var serviceName = require('multicast-dns-service-types')
var txt = require('dns-txt')()

var TLD = '.local'

module.exports = Service

util.inherits(Service, EventEmitter)

function Service (opts) {
  if (!opts.name) throw new Error('Required name not given')
  if (!opts.type) throw new Error('Required type not given')
  if (!opts.port) throw new Error('Required port not given')

  this.name = opts.name
  this.protocol = opts.protocol || 'tcp'
  this.type = serviceName.stringify(opts.type, this.protocol)
  this.host = opts.host || os.hostname()
  this.port = opts.port
  this.fqdn = this.name + '.' + this.type + TLD
  this.subtypes = opts.subtypes || null
  this.txt = opts.txt || []
  this.published = false

  this._activated = false // indicates intent - true: starting/started, false: stopping/stopped
}

Service.prototype._records = function () {
  var records = [rrPtr(this), rrSrv(this), rrTxt(this)]

  var self = this
  var interfaces = os.networkInterfaces()
  Object.keys(interfaces).forEach(function (name) {
    interfaces[name].forEach(function (addr) {
      if (addr.internal) return
      if (addr.family === 'IPv4') {
        records.push(rrA(self, addr.address))
      } else {
        records.push(rrAaaa(self, addr.address))
      }
    })
  })

  return records
}

function rrPtr (service) {
  return {
    name: service.type + TLD,
    type: 'PTR',
    ttl: 28800,
    data: service.fqdn
  }
}

function rrSrv (service) {
  return {
    name: service.fqdn,
    type: 'SRV',
    ttl: 120,
    data: {
      port: service.port,
      target: service.host
    }
  }
}

function rrTxt (service) {
  if (service.hasOwnProperty('txt')) {
    if (service.txt) {
      var txtKeyValues = []
      Object.keys(service.txt).forEach(function (key) {
        var _obj = {}
        _obj[key] = service.txt[key]
        txtKeyValues.push(txt.encode(_obj).slice(1))
      })
    }
  }
  return {
    name: service.fqdn,
    type: 'TXT',
    ttl: 4500,
    data: txtKeyValues
  }
}

function rrA (service, ip) {
  return {
    name: service.host,
    type: 'A',
    ttl: 120,
    data: ip
  }
}

function rrAaaa (service, ip) {
  return {
    name: service.host,
    type: 'AAAA',
    ttl: 120,
    data: ip
  }
}

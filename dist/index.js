"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketIOMetrics = exports.metrics = void 0;
const express = require("express");
const prom = require("prom-client");
function metrics(ioServer, options) {
    return new SocketIOMetrics(ioServer, options);
}
exports.metrics = metrics;
class SocketIOMetrics {
    constructor(ioServer, options) {
        this.boundNamespaces = new Set();
        this.defaultOptions = {
            port: 9090,
            path: '/metrics',
            createServer: true,
            collectDefaultMetrics: false,
            checkForNewNamespaces: true,
        };
        this.options = Object.assign(Object.assign({}, this.defaultOptions), options);
        this.ioServer = ioServer;
        this.register = prom.register;
        this.initMetrics();
        this.bindMetrics();
        if (this.options.collectDefaultMetrics) {
            prom.collectDefaultMetrics({
                register: this.register,
            });
        }
        if (this.options.createServer) {
            this.start();
        }
    }
    start() {
        if (!this.expressServer || !this.expressServer.listening) {
            this.initServer();
        }
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.expressServer.close();
        });
    }
    initServer() {
        this.express = express();
        this.expressServer = this.express.listen(this.options.port);
        this.express.get(this.options.path, (req, res) => {
            res.set('Content-Type', this.register.contentType);
            res.end(this.register.metrics());
        });
    }
    initMetrics() {
        this.metrics = {
            connectedSockets: new prom.Gauge({
                name: 'socket_io_connected',
                help: 'Number of currently connected sockets',
            }),
            connectTotal: new prom.Counter({
                name: 'socket_io_connect_total',
                help: 'Total count of socket.io connection requests',
                labelNames: ['namespace'],
            }),
            disconnectTotal: new prom.Counter({
                name: 'socket_io_disconnect_total',
                help: 'Total count of socket.io disconnections',
                labelNames: ['namespace'],
            }),
            eventsReceivedTotal: new prom.Counter({
                name: 'socket_io_events_received_total',
                help: 'Total count of socket.io received events',
                labelNames: ['event', 'namespace'],
            }),
            eventsSentTotal: new prom.Counter({
                name: 'socket_io_events_sent_total',
                help: 'Total count of socket.io sent events',
                labelNames: ['event', 'namespace'],
            }),
            bytesReceived: new prom.Counter({
                name: 'socket_io_receive_bytes',
                help: 'Total socket.io bytes received',
                labelNames: ['event', 'namespace'],
            }),
            bytesTransmitted: new prom.Counter({
                name: 'socket_io_transmit_bytes',
                help: 'Total socket.io bytes transmitted',
                labelNames: ['event', 'namespace'],
            }),
            errorsTotal: new prom.Counter({
                name: 'socket_io_errors_total',
                help: 'Total socket.io errors',
                labelNames: ['namespace'],
            }),
        };
    }
    bindMetricsOnEmitter(server, labels) {
        const blacklisted_events = new Set([
            'error',
            'connect',
            'disconnect',
            'disconnecting',
            'newListener',
            'removeListener',
        ]);
        server.on('connect', (socket) => {
            this.metrics.connectTotal.inc(labels);
            this.metrics.connectedSockets.set(this.ioServer.engine.clientsCount);
            socket.on('disconnect', () => {
                this.metrics.disconnectTotal.inc(labels);
                this.metrics.connectedSockets.set(this.ioServer.engine.clientsCount);
            });
            const org_emit = socket.emit;
            socket.emit = (event, ...data) => {
                if (!blacklisted_events.has(event)) {
                    let labelsWithEvent = Object.assign({ event: event }, labels);
                    this.metrics.bytesTransmitted.inc(labelsWithEvent, this.dataToBytes(data));
                    this.metrics.eventsSentTotal.inc(labelsWithEvent);
                }
                return org_emit.apply(socket, [event, ...data]);
            };
            socket.onAny((event, ...args) => {
                if (event === 'error') {
                    this.metrics.connectedSockets.set(this.ioServer.engine.clientsCount);
                    this.metrics.errorsTotal.inc(labels);
                }
                else if (!blacklisted_events.has(event)) {
                    let labelsWithEvent = Object.assign({ event: event }, labels);
                    this.metrics.bytesReceived.inc(labelsWithEvent, this.dataToBytes(args));
                    this.metrics.eventsReceivedTotal.inc(labelsWithEvent);
                }
            });
        });
        const org_emit = server.emit;
        server.emit = (event, ...data) => {
            if (!blacklisted_events.has(event)) {
                let labelsWithEvent = Object.assign({ event: event }, labels);
                this.metrics.bytesTransmitted.inc(labelsWithEvent, this.dataToBytes(data));
                this.metrics.eventsSentTotal.inc(labelsWithEvent);
            }
            return org_emit.apply(server, [event, ...data]);
        };
    }
    bindNamespaceMetrics(server, namespace) {
        if (this.boundNamespaces.has(namespace)) {
            return;
        }
        const namespaceServer = server.of(namespace);
        this.bindMetricsOnEmitter(namespaceServer, { namespace: namespace });
        this.boundNamespaces.add(namespace);
    }
    bindMetrics() {
        this.ioServer._nsps.forEach((nsp) => this.bindNamespaceMetrics(this.ioServer, nsp.name));
        if (this.options.checkForNewNamespaces) {
            setInterval(() => {
                this.ioServer._nsps.forEach((nsp) => this.bindNamespaceMetrics(this.ioServer, nsp.name));
            }, 2000);
        }
    }
    dataToBytes(data) {
        try {
            return Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data) || '', 'utf8');
        }
        catch (e) {
            return 0;
        }
    }
}
exports.SocketIOMetrics = SocketIOMetrics;

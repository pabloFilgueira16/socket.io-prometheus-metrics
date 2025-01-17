/// <reference types="node" />
import * as http from 'http';
import * as io from 'socket.io';
import * as prom from 'prom-client';
export declare function metrics(ioServer: io.Server, options?: IMetricsOptions): SocketIOMetrics;
export interface IMetricsOptions {
    port?: number | string;
    path?: string;
    createServer?: boolean;
    collectDefaultMetrics?: boolean;
    checkForNewNamespaces?: boolean;
}
export interface IMetrics {
    connectedSockets: prom.Gauge;
    connectTotal: prom.Counter;
    disconnectTotal: prom.Counter;
    eventsReceivedTotal: prom.Counter;
    eventsSentTotal: prom.Counter;
    bytesReceived: prom.Counter;
    bytesTransmitted: prom.Counter;
    errorsTotal: prom.Counter;
}
export declare class SocketIOMetrics {
    register: prom.Registry;
    metrics: IMetrics;
    private ioServer;
    private express;
    private expressServer;
    private options;
    private boundNamespaces;
    private defaultOptions;
    constructor(ioServer: io.Server, options?: IMetricsOptions);
    start(): void;
    close(): Promise<http.Server>;
    private initServer;
    private initMetrics;
    private bindMetricsOnEmitter;
    private bindNamespaceMetrics;
    private bindMetrics;
    private dataToBytes;
}

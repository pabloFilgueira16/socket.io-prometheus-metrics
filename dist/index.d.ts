import * as io from 'socket.io';
import * as prom from 'prom-client';
export declare function metrics(ioServer: io.Server, options?: IMetricsOptions): SocketIOMetrics;
export interface IMetricsOptions {
    port?: number | string;
    path?: string;
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
    private options;
    private boundNamespaces;
    private defaultOptions;
    constructor(ioServer: io.Server, options?: IMetricsOptions);
    private initMetrics;
    private bindMetricsOnEmitter;
    private bindNamespaceMetrics;
    private bindMetrics;
    private dataToBytes;
}

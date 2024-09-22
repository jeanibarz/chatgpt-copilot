
export interface IChatGPTMessage {
    type: string;
    value?: string;
    code?: string;
    inProgress?: boolean;
    showStopButton?: boolean;
    autoScroll?: boolean;
    files?: { path: string; lines: number; }[];
    [key: string]: any;
}

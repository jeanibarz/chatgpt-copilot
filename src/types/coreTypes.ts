import { CallWarning, CoreTool, CoreToolChoice, FinishReason, LanguageModelResponseMetadataWithHeaders, ProviderMetadata, Schema, TextStreamPart } from "ai";
import { z } from "zod";
import { CallSettings, LanguageModelUsage$1, Prompt, StepResult, TelemetrySettings, ToToolCall, ToToolResult } from "./aiTypes";

type GenerateObjectCallOptions<OBJECT> = Omit<CallSettings, 'stopSequences'> & Prompt & {
    output?: 'object' | undefined;
    /**
     * The schema of the object that the model should generate.
     */
    schema: z.Schema<OBJECT, z.ZodTypeDef, any> | Schema<OBJECT>;
    /**
     * Optional name of the output that should be generated.
     */
    schemaName?: string;
    /**
     * Optional description of the output that should be generated.
     */
    schemaDescription?: string;
    /**
     * The mode to use for object generation.
     */
    mode?: 'auto' | 'json' | 'tool';
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific metadata.
     */
    experimental_providerMetadata?: ProviderMetadata;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
    };
};

type StreamTextCallOptions<TOOLS extends Record<string, CoreTool>> = CallSettings & Prompt & {
    /**
     * The tools that the model can call. The model needs to support calling tools.
     */
    tools?: TOOLS;
    /**
     * The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: CoreToolChoice<TOOLS>;
    /**
     * Maximum number of automatic roundtrips for tool calls.
     * 
     * An automatic tool call roundtrip is another LLM call with the tool call results when all tool calls of the last assistant message have results.
     * A maximum number is required to prevent infinite loops in the case of misconfigured tools.
     * 
     * @deprecated Use `maxSteps` instead (which is `maxToolRoundtrips` + 1).
     */
    maxToolRoundtrips?: number;
    /**
     * Maximum number of sequential LLM calls (steps), e.g. when you use tool calls. Must be at least 1.
     * 
     * A maximum number is required to prevent infinite loops in the case of misconfigured tools.
     * 
     * By default, it's set to 1, which means that only a single LLM call is made.
     */
    maxSteps?: number;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific metadata. They are passed through to the provider from the AI SDK and enable provider-specific functionality.
     */
    experimental_providerMetadata?: ProviderMetadata;
    /**
     * Enable streaming of tool call deltas as they are generated. Disabled by default.
     */
    experimental_toolCallStreaming?: boolean;
    /**
     * Callback that is called for each chunk of the stream. The stream processing will pause until the callback promise is resolved.
     */
    onChunk?: (event: {
        chunk: Extract<TextStreamPart<TOOLS>, {
            type: 'text-delta' | 'tool-call' | 'tool-call-streaming-start' | 'tool-call-delta' | 'tool-result';
        }>;
    }) => Promise<void> | void;
    /**
     * Callback that is called when the LLM response and all request tool executions (for tools that have an `execute` function) are finished.
     */
    onFinish?: (event: {
        /**
         * The reason why the generation finished.
         */
        finishReason: FinishReason;
        /**
         * The token usage of the generated response.
         */
        usage: LanguageModelUsage$1;
        /**
         * The full text that has been generated.
         */
        text: string;
        /**
         * The tool calls that have been executed.
         */
        toolCalls?: ToToolCall<TOOLS>[];
        /**
         * The tool results that have been generated.
         */
        toolResults?: ToToolResult<TOOLS>[];
        /**
         * Optional raw response data.
         * @deprecated Use `response` instead.
         */
        rawResponse?: {
            /**
             * Response headers.
             */
            headers?: Record<string, string>;
        };
        /**
         * Response metadata.
         */
        response: LanguageModelResponseMetadataWithHeaders;
        /**
         * Details for all steps.
         */
        steps: StepResult<TOOLS>[];
        /**
         * Warnings from the model provider (e.g. unsupported settings).
         */
        warnings?: CallWarning[];
        /**
         * Additional provider-specific metadata.
         */
        readonly experimental_providerMetadata: ProviderMetadata | undefined;
    }) => Promise<void> | void;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        now?: () => number;
        generateId?: () => string;
        currentDate?: () => Date;
    };
};

type WorkflowType = 'simple' | 'advanced' | 'basicDocstringGenerator' | 'mermaidDiagramGenerator';

export {
    GenerateObjectCallOptions,
    StreamTextCallOptions,
    WorkflowType
};

import { AttributeValue } from '@opentelemetry/api';
import { CallWarning, CoreMessage, CoreTool, FinishReason, LanguageModelResponseMetadataWithHeaders, LogProbs, Schema } from 'ai';
import { z } from 'zod';

type ToToolCallArray<TOOLS extends Record<string, CoreTool>> = Array<ToToolCall<TOOLS>>;
type ToToolResultArray<TOOLS extends Record<string, CoreTool>> = Array<ToToolResult<TOOLS>>;
type StepResult<TOOLS extends Record<string, CoreTool>> = {
    /**
  The generated text.
  */
    readonly text: string;
    /**
  The tool calls that were made during the generation.
  */
    readonly toolCalls: ToToolCallArray<TOOLS>;
    /**
  The results of the tool calls.
  */
    readonly toolResults: ToToolResultArray<TOOLS>;
    /**
  The reason why the generation finished.
  */
    readonly finishReason: FinishReason;
    /**
  The token usage of the generated text.
  */
    readonly usage: LanguageModelUsage$1;
    /**
  Warnings from the model provider (e.g. unsupported settings)
  */
    readonly warnings: CallWarning[] | undefined;
    /**
  Logprobs for the completion.
  `undefined` if the mode does not support logprobs or if was not enabled.
  */
    readonly logprobs: LogProbs | undefined;
    /**
  Optional raw response data.
  
  @deprecated Use `response.headers` instead.
     */
    readonly rawResponse?: {
        /**
    Response headers.
    */
        readonly headers?: Record<string, string>;
    };
    /**
  Additional response information.
  */
    readonly response: LanguageModelResponseMetadataWithHeaders;
};
/**
Represents the number of tokens used in a prompt and completion.
 */
type LanguageModelUsage$1 = {
    /**
  The number of tokens used in the prompt.
     */
    promptTokens: number;
    /**
  The number of tokens used in the completion.
   */
    completionTokens: number;
    /**
  The total number of tokens used (promptTokens + completionTokens).
     */
    totalTokens: number;
};
type Parameters = z.ZodTypeAny | Schema<any>;
type inferParameters<PARAMETERS extends Parameters> = PARAMETERS extends Schema<any> ? PARAMETERS['_type'] : PARAMETERS extends z.ZodTypeAny ? z.infer<PARAMETERS> : never;
type ToToolCall<TOOLS extends Record<string, CoreTool>> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-call';
        toolCallId: string;
        toolName: NAME & string;
        args: inferParameters<TOOLS[NAME]['parameters']>;
    };
}>;
type ToToolsWithExecute<TOOLS extends Record<string, CoreTool>> = {
    [K in keyof TOOLS as TOOLS[K] extends {
        execute: any;
    } ? K : never]: TOOLS[K];
};
type ToToolsWithDefinedExecute<TOOLS extends Record<string, CoreTool>> = {
    [K in keyof TOOLS as TOOLS[K]['execute'] extends undefined ? never : K]: TOOLS[K];
};
type ToToolResult<TOOLS extends Record<string, CoreTool>> = ToToolResultObject<ToToolsWithDefinedExecute<ToToolsWithExecute<TOOLS>>>;
type ValueOf<ObjectType, ValueType extends keyof ObjectType = keyof ObjectType> = ObjectType[ValueType];
type ToToolResultObject<TOOLS extends Record<string, CoreTool>> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-result';
        toolCallId: string;
        toolName: NAME & string;
        args: inferParameters<TOOLS[NAME]['parameters']>;
        result: Awaited<ReturnType<Exclude<TOOLS[NAME]['execute'], undefined>>>;
    };
}>;
/**
Prompt part of the AI function options. It contains a system message, a simple text prompt, or a list of messages.
 */
type Prompt = {
    /**
  System message to include in the prompt. Can be used with `prompt` or `messages`.
     */
    system?: string;
    /**
  A simple text prompt. You can either use `prompt` or `messages` but not both.
   */
    prompt?: string;
    /**
  A list of messsages. You can either use `prompt` or `messages` but not both.
     */
    messages?: Array<CoreMessage>;
};
/**
 * Telemetry configuration.
 */
type TelemetrySettings = {
    /**
     * Enable or disable telemetry. Disabled by default while experimental.
     */
    isEnabled?: boolean;
    /**
     * Enable or disable input recording. Enabled by default.
     *
     * You might want to disable input recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordInputs?: boolean;
    /**
     * Enable or disable output recording. Enabled by default.
     *
     * You might want to disable output recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordOutputs?: boolean;
    /**
     * Identifier for this function. Used to group telemetry data by function.
     */
    functionId?: string;
    /**
     * Additional information to include in the telemetry data.
     */
    metadata?: Record<string, AttributeValue>;
};
type CallSettings = {
    /**
  Maximum number of tokens to generate.
     */
    maxTokens?: number;
    /**
  Temperature setting. This is a number between 0 (almost no randomness) and
  1 (very random).
  
  It is recommended to set either `temperature` or `topP`, but not both.
  
  @default 0
     */
    temperature?: number;
    /**
  Nucleus sampling. This is a number between 0 and 1.
  
  E.g. 0.1 would mean that only tokens with the top 10% probability mass
  are considered.
  
  It is recommended to set either `temperature` or `topP`, but not both.
     */
    topP?: number;
    /**
  Only sample from the top K options for each subsequent token.
  
  Used to remove "long tail" low probability responses.
  Recommended for advanced use cases only. You usually only need to use temperature.
     */
    topK?: number;
    /**
  Presence penalty setting. It affects the likelihood of the model to
  repeat information that is already in the prompt.
  
  The presence penalty is a number between -1 (increase repetition)
  and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    presencePenalty?: number;
    /**
  Frequency penalty setting. It affects the likelihood of the model
  to repeatedly use the same words or phrases.
  
  The frequency penalty is a number between -1 (increase repetition)
  and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    frequencyPenalty?: number;
    /**
  Stop sequences.
  If set, the model will stop generating text when one of the stop sequences is generated.
  Providers may have limits on the number of stop sequences.
     */
    stopSequences?: string[];
    /**
  The seed (integer) to use for random sampling. If set and supported
  by the model, calls will generate deterministic results.
     */
    seed?: number;
    /**
  Maximum number of retries. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
  Additional HTTP headers to be sent with the request.
  Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

export {
    CallSettings, inferParameters, LanguageModelUsage$1,
    Parameters, Prompt, StepResult, TelemetrySettings, ToToolCall, ToToolCallArray, ToToolResult, ToToolResultArray, ToToolResultObject, ToToolsWithDefinedExecute, ToToolsWithExecute, ValueOf
};


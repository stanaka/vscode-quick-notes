import * as vscode from 'vscode'

/**
 * Logger class to handle all logging in the extension
 * Uses VS Code's built-in OutputChannel for logging
 */
export class Logger {
    private static _instance: Logger
    private _outputChannel: vscode.OutputChannel
    private _level: LogLevel = LogLevel.Info

    private constructor() {
        this._outputChannel = vscode.window.createOutputChannel('Quick Notes')
    }

    public static getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger()
        }
        return Logger._instance
    }

    public setLogLevel(level: LogLevel): void {
        this._level = level
    }

    public debug(message: string): void {
        if (this._level <= LogLevel.Debug) {
            this._log(`DEBUG: ${message}`)
        }
    }

    public info(message: string): void {
        if (this._level <= LogLevel.Info) {
            this._log(`INFO: ${message}`)
        }
    }

    public warn(message: string): void {
        if (this._level <= LogLevel.Warning) {
            this._log(`WARN: ${message}`)
        }
    }

    public error(message: string, error?: Error): void {
        if (this._level <= LogLevel.Error) {
            this._log(`ERROR: ${message}`)
            if (error) {
                this._log(error.stack || error.message)
            }
        }
    }

    private _log(message: string): void {
        const timestamp = new Date().toISOString()
        this._outputChannel.appendLine(`[${timestamp}] ${message}`)
    }

    public show(): void {
        this._outputChannel.show()
    }

    public dispose(): void {
        this._outputChannel.dispose()
    }
}

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    None = 4
}
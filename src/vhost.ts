import * as ts from 'typescript'
import * as path from 'path'
import { vol } from 'memfs'
import Dirent from 'memfs/lib/Dirent'

class VHost implements ts.CompilerHost {
  constructor(
    public data: Record<string, string | null> = {},
    public cwd: string = '/'
  ) {
    vol.fromJSON(data, cwd)
  }

  fileExists(fileName: string): boolean {
    try {
      return vol.statSync(fileName).isFile()
    } catch (e) {
      return false
    }
  }

  readFile(fileName: string): string | undefined {
    try {
      return vol.readFileSync(fileName).toString()
    } catch (e) {
      return undefined
    }
  }

  /**
   * @todo
   */
  /* istanbul ignore next */
  trace(s: string): void {}

  directoryExists(directoryName: string): boolean {
    try {
      return vol.statSync(directoryName).isDirectory()
    } catch (e) {
      return false
    }
  }

  /* istanbul ignore next */
  realpath(path: string): string {
    return vol.realpathSync(path).toString()
  }

  getCurrentDirectory(): string {
    return this.cwd
  }

  /* istanbul ignore next */
  getDirectories(path: string): string[] {
    const dirents = vol.readdirSync(path, {
      withFileTypes: true
    }) as Dirent[]

    return dirents.reduce<string[]>((acc, dirent) => {
      if (dirent.isDirectory()) acc.push(dirent.name.toString())
      return acc
    }, [])
  }

  private resolveFilePath(
    fileName: string,
    cwd: string = this.getCurrentDirectory()
  ): string {
    return path.posix.resolve(cwd, fileName)
  }

  writeFile(
    fileName: string,
    data: string,
    _writeByteOrderMark: boolean,
    onError?: (message: string) => void,
    _sourceFiles?: ReadonlyArray<ts.SourceFile>
  ): void {
    const filePath: string = this.resolveFilePath(fileName)
    try {
      vol.writeFileSync(filePath, data)
    } catch (e) {
      /* istanbul ignore next */
      if (`function` === typeof onError) onError(e.message)
    }
  }

  getSourceFile(
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean
  ): ts.SourceFile | undefined {
    return this.getSourceFileByPath(
      fileName,
      this.cwd as ts.Path,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    )
  }

  getSourceFileByPath(
    fileName: string,
    path: ts.Path,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean
  ): ts.SourceFile | undefined {
    const filePath: string = this.resolveFilePath(fileName, path)
    const fileContent: string | undefined = this.readFile(filePath)
    if (undefined !== fileContent) {
      return ts.createSourceFile(filePath, fileContent, languageVersion)
    } else {
      if (`function` === typeof onError)
        onError(`ENOENT: no such file or directory, stat '${fileName}'`)
      /* istanbul ignore if */
      if (shouldCreateNewSourceFile) {
        const content: string = ``
        this.writeFile(filePath, content, true)
        return ts.createSourceFile(filePath, content, languageVersion)
      }
      return undefined
    }
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return path.resolve(
      this.getCurrentDirectory(),
      ts.getDefaultLibFileName(options)
    )
  }

  getCanonicalFileName(fileName: string): string {
    return fileName
  }

  useCaseSensitiveFileNames(): boolean {
    return true
  }

  /* istanbul ignore next */
  getNewLine(): string {
    return `\n`
  }

  // getCancellationToken(): ts.CancellationToken {}
  // getDefaultLibLocation(): string {}
  // readDirectory(rootDir: string, extensions: ReadonlyArray<string>, excludes: ReadonlyArray<string> | undefined, includes: ReadonlyArray<string>, depth?: number): string[] {}
  // resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: ResolvedProjectReference): (ResolvedModule | undefined)[] {}
  // resolveTypeReferenceDirectives?(typeReferenceDirectiveNames: string[], containingFile: string, redirectedReference?: ts.ResolvedProjectReference): (ts.ResolvedTypeReferenceDirective | undefined)[] {}
  // getEnvironmentVariable?(name: string): string | undefined {}
  // createHash?(data: string): string {}
  // getParsedCommandLine?(fileName: string): ts.ParsedCommandLine | undefined {}
}

export default function createVHost(
  data: Record<string, string | null> = {},
  cwd: string = '/'
): VHost {
  return new VHost(data, cwd)
}

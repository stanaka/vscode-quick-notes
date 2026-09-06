import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
    })
    mocha.options.color = true

    const testsRoot = path.resolve(__dirname, '..')
    const files = await glob('**/**.test.js', { cwd: testsRoot })

    // Add files to the test suite
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

    await new Promise<void>((resolve, reject) => {
        try {
            // Run the mocha test
            mocha.run((failures) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`))
                } else {
                    resolve()
                }
            })
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
        }
    })
}

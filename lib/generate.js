const jsdom = require('jsdom');
const { stringify } = require('javascript-stringify');
const fs = require('fs');
const path = require('path');

const logger = require('./utils/logger');
const collectors = require('./generate/collector');
const extractCommonBundle = require('./generate/extractCommonBundle');

module.exports = async (generationConfig) => {
    const virtualConsole = new jsdom.VirtualConsole();
    const dom = new jsdom.JSDOM('', {
        runScripts: 'dangerously',
        resources: 'usable',
        url: generationConfig.pageUrl, // Set your page URL here
        virtualConsole: virtualConsole,
    });
    const browserContext = await dom.browser.createContext();

    if (generationConfig.skipCheckout) {
        delete collectors['checkout'];
    }

    logger.info('Collecting bundle modules in the browser.');

    let bundles = [];
    for (const collectorName in collectors) {
        bundles.push(
            await collectors[collectorName](browserContext, generationConfig)
        );
    }

    logger.debug('Finished, closing the browser.');

    await browserContext.close();

    logger.debug('Extracting common module...');

    bundles = extractCommonBundle(bundles);

    logger.success('Done, outputting following modules:');

    bundles.forEach((bundle) => {
        logger.success(
            `${bundle.name} - ${Object.keys(bundle.modules).length} items.`
        );
    });

    fs.writeFileSync(
        path.resolve('magepack.config.js'),
        `module.exports = ${stringify(bundles, null, '  ')}`
    );
};

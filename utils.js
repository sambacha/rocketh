const path = require('path');
const fs = require('fs');
const colors = require('colors/safe');
const ethers = require('ethers');

function requireLocal(moduleName) {
    // TODO if all else fails. rocketh could provide a default
    let currentFolder = path.resolve('./')
    do {
        try{
            const nodeModule = path.join(currentFolder,'node_modules', moduleName);
            // console.log('trying ' + nodeModule + '...');
            return require(nodeModule);
        } catch(e) {
            // console.error(e);
        }
        currentFolder = path.resolve(currentFolder, '..');
    } while (path.resolve(currentFolder, '..') != currentFolder);

    throw(new Error("can't find module " + moduleName));
}

function executeServer(server, port) {
    return new Promise((resolve, reject) => {
        server.listen(port, function(err, blockchain) {
            if(err) {
                reject(err);     
            } else {
                resolve(blockchain)
            }
        });
    });
}

function getAccountsFromMnemonic(mnemonic, num) {
    const accounts = [];
    for(let i = 0; i < num; i++) { // TODO 10 is config of number of accounts
        const wallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/"+i);
        accounts.push(wallet.address);
    }
    return accounts;
}

function onExit(childProcess) {
    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code, signal) => {
        if (code === 0) {
            resolve();
        } else {
            reject({error: new Error('Exit with error code: '+code), code});
        }
        });
        childProcess.once('error', (err) => {
            reject(err);
        });
    });
}

function fetchTransaction(url, hash) {
    const provider = new ethers.providers.JsonRpcProvider(url);
    return provider.send('eth_getTransactionByHash',[hash]);
}

function fetchAccounts(url) {
    const provider = new ethers.providers.JsonRpcProvider(url);
    return provider.send('eth_accounts',[]);
}

function fetchChainId(url, use_net_version) {
    const method = use_net_version ? 'net_version' : 'eth_chainId';
    const provider = new ethers.providers.JsonRpcProvider(url);
    return provider.send(method,[]).then((chainId) => {
        return chainId;
    });
}

function fetchChainIdViaWeb3Provider(provider, use_net_version) { // TODO remove
    const method = use_net_version ? 'net_version' : 'eth_chainId';
    return new Promise((resolve, reject) => {
        provider.send({id:1, method, params:[], jsonrpc: '2.0'}, (error, json) => {
            if (error) {
                reject(error);
            } else {
                resolve(json.result);
            }
        })
    });
}

const traverse = function(dir, result = [], topDir) {
    fs.readdirSync(dir).forEach((name) => {
        const fPath = path.resolve(dir, name);
        const stats = fs.statSync(fPath);
        const fileStats = { name, path: fPath, relativePath: path.relative(topDir || dir, fPath), mtimeMs: stats.mtimeMs, directory: stats.isDirectory() };
        if (fileStats.directory) {
            result.push(fileStats);
            return traverse(fPath, result, topDir || dir)
        }
        result.push(fileStats);
    });
    return result;
};

let silent = false;
function log(...args) {
    if(silent) { return; }
    console.log.apply(console, args);
}

module.exports = {
    onExit,
    traverse,
    requireLocal,
    executeServer,
    fetchAccounts,
    fetchChainId,
    fetchChainIdViaWeb3Provider,
    fetchTransaction,
    getAccountsFromMnemonic,
    log : {
        setSlient: (s) => silent = s,
        log : (...args) => log(...args),
        error: (...args) => console.error(...args),
        red : (message) => console.error(colors.red(message)),
        green : (message) => log(colors.green(message)),
        blue : (message) => log(colors.blue(message)),
        cyan : (message) => log(colors.cyan(message)),
        yellow : (message) => log(colors.yellow(message)),
    }
    
}
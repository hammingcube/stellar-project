const accountUrl = function(pair) {
    return `https://friendbot.stellar.org?addr=${encodeURIComponent(pair.publicKey())}`
}


async function createAccount(pair) {
    const response = await fetch(accountUrl(pair));
    const responseJSON = await response.json();
    return {pair: pair, response: responseJSON}
}


function createKeyPairs(numKeyPairs) {
    var pairs = [];
    for(i = 0; i < numKeyPairs; i++) {
        pair = StellarSdk.Keypair.random();
        pairs.push(pair)
    }
    return pairs;
}


async function createAccounts(numAccounts) {
    pairs = createKeyPairs(numAccounts)
    promises = pairs.map((pair) => createAccount(pair));
    return Promise.all(promises);
}


async function sendPayment(value, src, dest, ch, resolve, reject) {
    StellarSdk.Network.useTestNetwork();
    var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    var sourceKeys = StellarSdk.Keypair
      .fromSecret(src.pair.secret());
    var channelKeys = StellarSdk.Keypair.fromSecret(ch.pair.secret());
    var destinationId = dest.pair.publicKey();
    // Transaction will hold a built transaction we can resubmit if the result is unknown.
    var transaction;
    
    // First, check to make sure that the destination account exists.
    // You could skip this, but if the account does not exist, you will be charged
    // the transaction fee when the transaction fails.
    server.loadAccount(destinationId)
      // If the account is not found, surface a nicer error message for logging.
      .catch(StellarSdk.NotFoundError, function (error) {
        throw new Error('The destination account does not exist!');
      })
      // If there was no error, load up-to-date information on your account.
      .then(function() {
        return server.loadAccount(sourceKeys.publicKey());
      })
      .then(function(sourceAccount) {
        return Promise.all([sourceAccount, server.loadAccount(channelKeys.publicKey())])
      })
      .then(function(accounts) {
        sourceAccount = accounts[0]
        channelAccount = accounts[1]
        // Start building the transaction.
        transaction = new StellarSdk.TransactionBuilder(channelAccount, opts={fee:100})
          .addOperation(StellarSdk.Operation.payment({
            source: sourceAccount.id,
            destination: destinationId,
            // Because Stellar allows transaction in many currencies, you must
            // specify the asset type. The special "native" asset represents Lumens.
            asset: StellarSdk.Asset.native(),
            amount: `${value}`
          }))
          // A memo allows you to add your own metadata to a transaction. It's
          // optional and does not affect how Stellar treats the transaction.
          .addMemo(StellarSdk.Memo.text('Test Transaction'))
          // Wait a maximum of three minutes for the transaction
          .setTimeout(180)
          .build();
        // Sign the transaction to prove you are actually the person sending it.
        transaction.sign(sourceKeys);
        transaction.sign(channelKeys);
        // And finally, send it off to Stellar!
        return server.submitTransaction(transaction);
      })
      .then(function(result) {
        console.log('Success! Results:', result);
        resolve(result);
      })
      .catch(function(error) {
        console.error('Something went wrong!', error);
        reject(error);
        // If the result is unknown (no response body, timeout etc.) we simply resubmit
        // already built transaction:
        // server.submitTransaction(transaction);
      });
}

function sendPaymentPromise(value, src, dest, ch) {
    var promise = new Promise(async function(resolve, reject) {
        await sendPayment(value, src, dest, ch, resolve);
    })
    return promise;
}


async function getBalance(pair) {
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
    const account = await server.loadAccount(pair.publicKey());
    return [pair.publicKey(), account.balances[0].balance];
}


async function prettyPrint(name, accounts) {
    promises = accounts.map((account) => getBalance(account.pair))
    var destBalances = await Promise.all(promises)
    console.log(`${name} Balances`)
    console.log(destBalances);
}

async function printAll(_data) {
    await prettyPrint('source accounts', _data.srcAccounts);
    await prettyPrint('destination accounts', _data.destinationAccounts);
    await prettyPrint('channel accounts', _data.channelAccounts);
}

async function smartMain(value, _data) {
    src = _data.srcAccounts[0]
    channelAccounts = _data.channelAccounts
    destinationAccounts = _data.destinationAccounts

    var beg = 0;
    while(beg < destinationAccounts.length) {
        let promises = channelAccounts.map((ch, i) => {
            dest = destinationAccounts[i+beg]
            return sendPaymentPromise(value, src, dest, ch)
            // console.log(i, ch.pair.publicKey());
            // console.log(i+beg, dest.pair.publicKey());
        });
        console.log('promises', promises)
        const resolvedPromises = await Promise.all(promises)
        for(let resolvedPromise of resolvedPromises) {
            console.log('resolved', resolvedPromise)
        }
        beg += channelAccounts.length

    }
}

async function main() {
    numSourceAccounts = 1
    numChannelAccounts = 2
    numDestinationAccounts = 4

    srcAccounts = await createAccounts(numSourceAccounts)
    channelAccounts = await createAccounts(numChannelAccounts)
    destinationAccounts = await createAccounts(numDestinationAccounts)

    var _data = {
        srcAccounts: srcAccounts,
        channelAccounts: channelAccounts,
        destinationAccounts: destinationAccounts,
    }
    value = 10;
    console.log('--------------')
    await printAll(_data)
    console.log('--------------')
    await smartMain(value, _data)
    console.log('--------------')
    await printAll(_data)
}
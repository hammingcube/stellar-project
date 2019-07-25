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

async function transferValueSlow(value, srcAccounts, destinationAccounts, channelAccounts) {
    window._data = {
        value: value,
        srcAccounts: srcAccounts,
        destinationAccounts: destinationAccounts,
        channelAccounts: channelAccounts,
    }
    console.log('value', value)
    console.log('srcAccounts', srcAccounts.length)
    console.log('destinationAccounts', destinationAccounts.length)
    console.log('channelAccounts', channelAccounts.length)
    theSrcAccount = srcAccounts[0]
    destinationAccounts.map((account) => showBalances(account.pair))
    await sendPayment(10, theSrcAccount, destinationAccounts[0])
    destinationAccounts.map((account) => showBalances(account.pair))
   
    // currentBalance = await getBalance(theSrcAccount)
    // if(currentBalance < value * length(destinationAccounts)) {
    //     return "insufficient balance";
    // }
}

async function transferValueFast(value, srcAccounts, destinationAccounts, channelAccounts) {
    theSrcAccount = srcAccounts[0]
    currentBalance = await getBalance(theSrcAccount)
    if(currentBalance < value * length(destinationAccounts)) {
        return "insufficient balance";
    }

    return null
}


// async function viaChannel(baseAccount, customerAddress, amountToSend, channelAccounts, channelIndex, baseAccountKey,) {
//     StellarSdk.Network.useTestNetwork();
//     // channelAccounts[] is an array of accountIDs, one for each channel
//     // channelKeys[] is an array of secret keys, one for each channel
//     // channelIndex is the channel you want to send this transaction over
    
//     // create payment from baseAccount to customerAddress
//     var transaction =
//       new StellarSdk.TransactionBuilder(channelAccounts[channelIndex])
//         .addOperation(StellarSdk.Operation.payment({
//           source: baseAccount.address(),
//           destination: customerAddress,
//           asset: StellarSdk.Asset.native(),
//           amount: amountToSend
//         }))
//         // Wait a maximum of three minutes for the transaction
//         .setTimeout(180)
//         .build();
    
//       transaction.sign(baseAccountKey);   // base account must sign to approve the payment
//       transaction.sign(channelKeys[channelIndex]);  // channel must sign to approve it being the source of the transaction
// }

async function transferValue(value, srcAccounts, destinationAccounts, channelAccounts) {
    transferValueSlow(value, srcAccounts, destinationAccounts, channelAccounts);
}

async function showBalances(pair) {
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

    // the JS SDK uses promises for most actions, such as retrieving an account
    const account = await server.loadAccount(pair.publicKey());
    console.log("Balances for account: " + pair.publicKey());
    account.balances.forEach(function(balance) {
      console.log("Type:", balance.asset_type, ", Balance:", balance.balance);
    });
}

async function sendPayment(value, src, dest) {
    StellarSdk.Network.useTestNetwork();
    var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    var sourceKeys = StellarSdk.Keypair
      .fromSecret(src.pair.secret());
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
        // Start building the transaction.
        transaction = new StellarSdk.TransactionBuilder(sourceAccount, opts={fee:478})
          .addOperation(StellarSdk.Operation.payment({
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
        // And finally, send it off to Stellar!
        return server.submitTransaction(transaction);
      })
      .then(function(result) {
        console.log('Success! Results:', result);
      })
      .catch(function(error) {
        console.error('Something went wrong!', error);
        // If the result is unknown (no response body, timeout etc.) we simply resubmit
        // already built transaction:
        // server.submitTransaction(transaction);
      });
}

async function main() {
    numDestinationAccounts = 4
    numChannelAccounts = 2
    numSourceAccounts = 1

    destinationAccounts = await createAccounts(numDestinationAccounts)
    channelAccounts = await createAccounts(numChannelAccounts)
    sourceAccounts = await createAccounts(numSourceAccounts)

    value = 1;
    result = await transferValue(value, sourceAccounts, destinationAccounts, channelAccounts)

}
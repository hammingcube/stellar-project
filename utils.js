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
    console.log('value', value)
    console.log('srcAccounts', srcAccounts.length)
    console.log('destinationAccounts', destinationAccounts.length)
    console.log('channelAccounts', channelAccounts.length)
    theSrcAccount = srcAccounts[0]
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

async function transferValue(value, srcAccounts, destinationAccounts, channelAccounts) {
    transferValueSlow(value, srcAccounts, destinationAccounts, channelAccounts);
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
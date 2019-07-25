# Stellar project

## Usage

Just run the following code using any static server. Example the following works.

```sh
python3 -m http.server 8000
```

The UI is very minimal and only calls `main` function in `utils.js`. This `main` function does the following.


1. It creates 1 source account(s), 2 channel account(s), and 4 destination account(s).
2. It then uses Stellar's [channels paradigm](https://www.stellar.org/developers/guides/channels.html) to transfer a value of `10 lumens` from the source account to each of the four destination accounts.
3. In the end, one can see that balance of source account is `9960` and each of the destination account has an additional `10` lumens and has a balance of `10010`.
4. Moreover, since we use channel accounts to do the transfer the fees is paid by channel accounts as can be seen from their balance.

Code is written to parallelize 2 transactions using 2 channels (via promises) but this can be increased easily to any desired number.



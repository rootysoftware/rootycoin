const sha256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class Transaction {
    constructor(from, to, amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }

    calculateHash() {
        return sha256(this.from + this.to + this.amount).toString();
    }

    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') != this.from) {
            throw new Error('403');
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    isValid() {
        if (this.from === null) {
            return true;
        }

        if (!this.signature || this.signature.length == 0) {
            throw new Error('no signature');
        }

        const publicKey = ec.keyFromPublic(this.from, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0;
    }

    calculateHash() {
        return sha256(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
    }

    mineBlock(difficulty) {
        while(this.hash.substring(0, difficulty) != Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log("block mined: " + this.hash);
    }

    hasValidTransaction() {
        this.transactions.forEach(transaction => {
            if (!transaction.isValid()) {
                return false;
            }
        });

        return true;
    }
}



class Blockchain {
    constructor () {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 1;
    }

    createGenesisBlock() {
        return new Block("01/01/2017", [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(rewardAddress) {
        let block = new Block(Date.now(), this.pendingTransactions);
        block.mineBlock(this.difficulty);

        console.log('Mining successfull!');
        this.chain.push(block);

        this.pendingTransactions = [
            new Transaction(null, rewardAddress, this.miningReward)
        ];
    }

    addTransaction(transaction) {
        if(!transaction.from || !transaction.to) {
            throw new Error('from or to address missing');
        }

        if (!transaction.isValid()) {
            throw new Error('invalid transaction');
        }

        this.pendingTransactions.push(transaction);
    }

    getBalanceOfAddress(address) {
        let balance = 0;

        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if (transaction.from == address) {
                    balance -= transaction.amount;
                }

                if (transaction.to == address) {
                    balance += transaction.amount;
                }
            });
        });

        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransaction()) {
                return false;
            }

            if (currentBlock.hash != currentBlock.calculateHash()) {
                return false;
            }
            
            if (currentBlock.previousHash != previousBlock.hash) {
                return false;
            }
        }

        return true;
    }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
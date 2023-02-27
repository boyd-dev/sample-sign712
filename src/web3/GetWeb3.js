import {ethers} from "ethers";

const getWeb3 = async () => {

    let provider = null;

    if (window.ethereum) {
        let p = new ethers.providers.Web3Provider(window.ethereum);
        await p.send("eth_requestAccounts", []);
        provider = p;
    } else {
        console.log("Can't find window.ethereum");
    }
    return provider;
}

const getCheckAccount = () => {
    if (window.ethereum) {
        return new Promise((resolve) => {
            window.ethereum.request({method: "eth_accounts"}).then((accounts)=>{
                return resolve(accounts.length > 0 || false);
            });
        })
    } else {
        return Promise.resolve(false);
    }
}

const getNetworkName = (chainId) => {
    let networkName;
    switch (parseInt(chainId)) {
        case 1:
            networkName = "Mainnet";
            break;
        case 5:
            networkName = "Görli";
            break;
        case 11155111:
            networkName = "Sepolia";
            break;
        default:
            networkName = "No Network";
    }
    return networkName;
}
// Alchemy
const API_KEY_ALCHEMY_GOERLI = "";
const API_KEY_ALCHEMY = "";
export default getWeb3;

export {
    getCheckAccount,
    getNetworkName,
    API_KEY_ALCHEMY_GOERLI,
    API_KEY_ALCHEMY
}
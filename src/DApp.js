import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, ButtonGroup, ButtonToolbar, Card, Col, Container, InputGroup, Row, Form} from "react-bootstrap";
import getWeb3, { getNetworkName } from "./web3/GetWeb3";
import {ethers} from "ethers";
import _ from "lodash";

import "./css/bootstrap-5.2.3-dist/css/bootstrap.min.css";

// EIP-712 메시지 구조
// "\x19\x01" || domainSeparator || hashStruct(message)
const domain = {
    name: 'Test',
    version: '1',
    chainId: 11155111, // Sepolia
    verifyingContract: '0x3A87C5fa9802eC4708088Ee63A98547Cc5A77D35',
};

const types = {
    Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' }
    ],
    Donation: [
        {name: 'from', type: 'Person'},
        {name: 'to', type: 'Person'},
        {name: 'value', type: 'uint256'}
        //{name: 'value', type: 'bytes32'}
    ]
};

const calculateHash = (domain, message) => {

    //1. domain 해시
    const eip712domain = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));
    const name =  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(domain.name));
    const version = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(domain.version));
    const chainId = domain.chainId;
    const verifyingContract = domain.verifyingContract;
    const eip712DomainHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "uint256", "address"],[eip712domain, name, version, chainId, verifyingContract]));

    //2. hashStruct 해시
    //2.1 Person 해시
    const personHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Person(string name,address wallet)"));

    const from = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message.from));
    const walletFrom = message.address_from;
    const personFrom = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "address"],[personHash, from, walletFrom]));

    const to = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message.to));
    const walletTo = message.address_to;
    const personTo = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "address"],[personHash, to, walletTo]));

    //2.2 Donation 해시
    const donationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Donation(Person from,Person to,uint256 value)Person(string name,address wallet)"));
    const value = ethers.utils.parseEther(message.value);

    //2.3 구조체 해시
    const hashStruct = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "uint256"],[donationHash, personFrom, personTo, value]));

    //2.4 최종 메시지 해시
    return ethers.utils.keccak256(ethers.utils.hexConcat(["0x19", "0x01", eip712DomainHash, hashStruct]));
}

const TEST_MESSAGE = {
    from: "Alice",
    address_from: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    to: "Kate",
    address_to: "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB",
    value: "5"
}

const abi = ["function verifyMessage712(\n" +
"         string memory _n,\n" +
"         string memory _v,\n" +
"         string memory _f,\n" +
"         address _fa,\n" +
"         string memory _t,\n" +
"         address _ta,\n" +
"         uint256 _m,\n" +
"         bytes memory signature      \n" +
"      ) public view returns (address)",];


function DApp() {

    const [signer, setSigner] = useState();
    const [provider, setProvider] = useState();
    const [alert, setAlert] = useState("");

    const [message, setMessage] = useState({});
    const [signature, setSignature] = useState({});
    const [contract, setContract] = useState(null);

    const from = useRef();
    const address_from = useRef();
    const to = useRef();
    const address_to = useRef();
    const donation = useRef();

    useEffect(() => {
        from.current.value = TEST_MESSAGE.from;
        address_from.current.value = TEST_MESSAGE.address_from;
        to.current.value = TEST_MESSAGE.to;
        address_to.current.value = TEST_MESSAGE.address_to;
        donation.current.value = TEST_MESSAGE.value;
        setMessage(TEST_MESSAGE);
    }, []);


    useEffect(() => {
        if (!_.isEmpty(signer)) {
            const c = new ethers.Contract(domain.verifyingContract, abi, signer);
            setContract(c);
        }
    }, [signer]);


    const handleConnect = async () => {
        const provider = await getWeb3();

        //console.log(provider);
        if (provider !== null) {
            setProvider(provider);
            provider.getNetwork().then(v => {
                setAlert(getNetworkName(v.chainId));
            });
            const s = await provider.getSigner(0);
            setSigner(s);
        }
    }

    const handleSign712 = async () => {
        if (provider !== null && signer !== null && !_.isEmpty(message)) {

            const value = {
                from: {name: message.from, wallet: message.address_from},
                to: {name: message.to, wallet: message.address_to},
                value: ethers.utils.parseEther(message.value)
            }
            const signature = await signer._signTypedData(domain, types, value);
            //console.log(signature);
            setAlert(signature);
            setSignature(signature);
        }
    }

    const handleChange = (e) => {

        const item = e.target.dataset.item;

        switch (item) {
            case "from":
                setMessage({...message, from: e.target.value});
                break;
            case "address_from":
                setMessage({...message, address_from: e.target.value});
                break;
            case "to":
                setMessage({...message, to: e.target.value});
                break;
            case "address_to":
                setMessage({...message, address_to: e.target.value});
                break;
            case "value":
                setMessage({...message, value: e.target.value});
                break;
            default:
                console.log("default");
        }
    }

    const handleVerify = async () => {
        if (!_.isEmpty(message) && contract && signature) {

            // 로컬에서 확인하기
            //const messageHash = calculateHash(domain, message);
            //console.log(messageHash, signature);

            // 컨트랙트에서 확인하기
            const address = await contract.verifyMessage712(
                domain.name,
                domain.version,
                message.from,
                message.address_from,
                message.to,
                message.address_to,
                ethers.utils.parseEther(message.value),
                signature
            );
            console.log(address);
        }
    }

    return (
        <Container fluid className="mt-3">
            <Row>
                <Col>
                    <Card>
                        <Card.Header>Sign EIP-712 Example</Card.Header>
                        <Card.Body>
                            <Container>
                                <Row className="pt-3">
                                    <Col className="col-md-6 col-12">
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text id="from">
                                                From
                                            </InputGroup.Text>
                                            <Form.Control
                                                aria-label="From"
                                                aria-describedby="from"
                                                data-item="from"
                                                onChange={handleChange}
                                                ref={from}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col className="col-md-6 col-12">
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text id="address_from">
                                                Address
                                            </InputGroup.Text>
                                            <Form.Control
                                                aria-label="address_from"
                                                aria-describedby="address_from"
                                                data-item="address_from"
                                                onChange={handleChange}
                                                ref={address_from}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col className="col-md-6 col-12">
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text id="to">
                                                To
                                            </InputGroup.Text>
                                            <Form.Control
                                                aria-label="To"
                                                aria-describedby="to"
                                                data-item="to"
                                                onChange={handleChange}
                                                ref={to}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col className="col-md-6 col-12">
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text id="address_to">
                                                Address
                                            </InputGroup.Text>
                                            <Form.Control
                                                aria-label="address_to"
                                                aria-describedby="address_to"
                                                data-item="address_to"
                                                onChange={handleChange}
                                                ref={address_to}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <InputGroup className="mb-3">
                                            <InputGroup.Text id="value">
                                                ETH Ξ
                                            </InputGroup.Text>
                                            <Form.Control
                                                aria-label="Value"
                                                aria-describedby="value"
                                                data-item="value"
                                                onChange={handleChange}
                                                ref={donation}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                                <Row className="pt-3">
                                    <Col>
                                        <ButtonToolbar>
                                            <ButtonGroup>
                                                <Button variant="outline-success" onClick={handleConnect}>Connect</Button>
                                                <Button variant="outline-success" onClick={handleSign712}>Sign EIP-712</Button>
                                                <Button variant="outline-success" onClick={handleVerify}>Verify</Button>
                                            </ButtonGroup>
                                        </ButtonToolbar>
                                    </Col>
                                </Row>
                            </Container>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Row className="pt-3">
                <Col>
                    {alert?
                        <Alert variant="success" className="text-break">{alert}</Alert>
                        :null
                    }
                </Col>
            </Row>

        </Container>
    );
}

export default DApp;
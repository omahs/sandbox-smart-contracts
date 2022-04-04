type Message = {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
};

type Contract = {
  address: string;
};

type Data712 = {
  types: {
    EIP712Domain: [
      {
        name: 'name';
        type: 'string';
      },
      {
        name: 'version';
        type: 'string';
      },
      {
        name: 'chainId';
        type: 'uint256';
      },
      {
        name: 'verifyingContract';
        type: 'address';
      }
    ];
    Permit: [
      {
        name: 'owner';
        type: 'address';
      },
      {
        name: 'spender';
        type: 'address';
      },
      {
        name: 'value';
        type: 'uint256';
      },
      {
        name: 'nonce';
        type: 'uint256';
      },
      {
        name: 'deadline';
        type: 'uint256';
      }
    ];
  };
  primaryType: 'Permit';
  domain: {
    name: 'The Sandbox';
    version: '1';
    chainId: '1';
    verifyingContract: string;
  };
  message: Message;
};

export const data712 = function (
  verifyingContract: Contract,
  message: Message
): Data712 {
  return {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Permit: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'spender',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'deadline',
          type: 'uint256',
        },
      ],
    },
    primaryType: 'Permit',
    domain: {
      name: 'The Sandbox',
      version: '1',
      chainId: '1',
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};

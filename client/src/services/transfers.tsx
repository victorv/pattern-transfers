import React, {
  useCallback,
  useContext,
  useMemo,
  useReducer,
  Dispatch,
  createContext,
} from 'react';

import keyBy from 'lodash/keyBy';
import groupBy from 'lodash/groupBy';

import { TransferType } from '../components/types';

import {
  getTransferIntentId,
  getTransfersByUser as apiGetTransfersByUser,
  getTransferStatus as apiGetTransferStatus,
} from './api';

interface TransfersState {
  transfer_intent_id: string;
  transfersById: {
    [transferId: number]: TransferType;
  };
}

const initialState = {
  transfer_intent_id: '',
  transfersById: {},
};
type TransfersAction =
  | {
      type: 'SET_TRANSFER_INTENT_ID';
      transfer_intent_id: string;
    }
  | { type: 'SUCCESSFUL_GET'; id: number; transfers: TransferType[] };

interface TransfersContextShape extends TransfersState {
  dispatch: Dispatch<TransfersAction>;
  transfersData: TransfersState;
  transfersByUser: {
    [userId: number]: TransferType[];
  };
  getTransfersByUser: (userId: number) => void;
  generateTransferIntentId: (
    userId: number,
    subscriptionAmount: number
  ) => string;
  updateTransfersStatusByUser: (userId: number) => void;
}
const TransfersContext = createContext<TransfersContextShape>(
  initialState as TransfersContextShape
);

/**
 * @desc Maintains the Transfers context state.
 */
export function TransfersProvider(props: any) {
  const [transfersData, dispatch] = useReducer(reducer, initialState);

  /**
   * @desc generates a new transferIntentId to use in link token creation for Transfer UI
   */

  const generateTransferIntentId = useCallback(
    async (userId, subscriptionAmount) => {
      const transferIntentResponse = await getTransferIntentId(
        userId,
        subscriptionAmount
      );
      const transfer_intent_id = transferIntentResponse.data.transfer_intent.id;
      dispatch({
        type: 'SET_TRANSFER_INTENT_ID',
        transfer_intent_id: transfer_intent_id,
      });
      return transfer_intent_id;
    },
    []
  );

  /**
   * @desc Requests all Transfers that belong to an individual User.
   */
  const getTransfersByUser = useCallback(async userId => {
    const { data: transfers } = await apiGetTransfersByUser(userId);
    console.log('all transfers', transfers);
    dispatch({ type: 'SUCCESSFUL_GET', id: userId, transfers: transfers });
  }, []);

  const updateTransfersStatusByUser = useCallback(async userId => {
    const { data: transfers } = await apiGetTransfersByUser(userId);
    await transfers.forEach(async (transfer: TransferType) => {
      const newTransfer = await apiGetTransferStatus(
        transfer.transfer_id,
        false
      );
      console.log('inside the for each function', newTransfer);
    });
    const { data: newTransfers } = await apiGetTransfersByUser(userId);
    console.log('all transfers after the fact', transfers);
    dispatch({ type: 'SUCCESSFUL_GET', id: userId, transfers: newTransfers });
  }, []);

  const value = useMemo(() => {
    const allTransfers = Object.values(transfersData.transfersById);
    return {
      allTransfers,
      transfersData,
      transfersByUser: groupBy(allTransfers, 'user_id'),
      generateTransferIntentId,
      getTransfersByUser,
      updateTransfersStatusByUser,
    };
  }, [
    transfersData,
    getTransfersByUser,
    generateTransferIntentId,
    updateTransfersStatusByUser,
  ]);

  return <TransfersContext.Provider value={value} {...props} />;
}

/**
 * @desc Handles updates to the Transfer state as dictated by dispatched actions.
 */
function reducer(state: any, action: TransfersAction) {
  switch (action.type) {
    case 'SET_TRANSFER_INTENT_ID':
      return {
        ...state,
        transfer_intent_id: action.transfer_intent_id,
      };
    case 'SUCCESSFUL_GET':
      if (!action.transfers.length) {
        return state;
      }
      return {
        ...state,
        transfersById: {
          ...state.transfersById,
          ...keyBy(action.transfers, 'id'),
        },
      };
    default:
      console.warn('unknown action');
      return state;
  }
}

/**
 * @desc A convenience hook to provide access to the Transfer context state in components.
 */
export default function useTransfers() {
  const context = useContext(TransfersContext);
  if (!context) {
    throw new Error(`useTransfers must be used within a TransfersProvider`);
  }

  return context;
}

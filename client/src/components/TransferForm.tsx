import React, { useState } from 'react';
import { NumberInput } from 'plaid-threads/NumberInput';
import { Button } from 'plaid-threads/Button';
import { currencyFilter } from '../util';
import { setMonthlyPayment, createTransfer, addPayment } from '../services/api';
import { PaymentType, ItemType, TransferType } from './types';

interface Props {
  setPayments: (payment: PaymentType) => void;
  setTransfers: (transfers: TransferType[]) => void;
  setIsLedgerView: (arg: boolean) => void;
  numOfItems: number;
  userId: number;
  payments: null | PaymentType;
  item: null | ItemType;
}
const TransferForm: React.FC<Props> = (props: Props) => {
  const [transferAmount, setTransferAmount] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const response = await setMonthlyPayment(
      props.userId,
      Number(transferAmount)
    );
    if (props.setPayments != null) {
      props.setPayments(response.data.updatedPayments[0]);
    }

    await setTransferAmount(
      `$${Number(transferAmount)
        .toFixed(2)
        .toString()}`
    );
  };

  const itemId = props.item != null ? props.item.id : 0;

  const monthlyPayment =
    props.payments != null ? props.payments.monthly_payment : 0;

  const initiateTransfer = async () => {
    const transfersResponse = await createTransfer(
      props.userId,
      itemId,
      monthlyPayment
    );
    props.setTransfers(transfersResponse.data);
    const paymentsResponse = await addPayment(props.userId, monthlyPayment);
    props.setPayments(paymentsResponse.data[0]);
  };

  const numberOfPayments =
    props.payments != null ? props.payments.number_of_payments : 0;

  const amt =
    parseFloat(transferAmount) > 0
      ? currencyFilter(parseFloat(transferAmount))
      : '';

  return (
    <>
      <div className="box developer-configs">
        <h4 className="subheading">Developer Configs</h4>{' '}
        <form className="developer-configs__form" onSubmit={handleSubmit}>
          <NumberInput
            id="transferAmount"
            name="transfer amount"
            value={transferAmount}
            required
            placeholder={
              monthlyPayment.toFixed(2).toString() ||
              'Monthly subscription amount'
            }
            label="Subscription price"
            onChange={e => {
              setTransferAmount(e.currentTarget.value);
            }}
            className="transfer-funds__input"
          />
          <Button className="developer-configs__button" centered type="submit">
            Update price
          </Button>
        </form>
        <Button
          className="developer-configs__button admin-ledger__button"
          secondary
          centered
          type="button"
          onClick={() => {
            props.setIsLedgerView(true);
          }}
        >
          View Admin Ledger
        </Button>
        <p className="admin-note">
          {' '}
          Note: visit the admin page to simulate Transfer events.
        </p>
        {props.numOfItems > 0 && (
          <div className="dev-configs-bottom-buttons__container">
            <Button
              className="initiate-payment__button"
              centered
              type="button"
              onClick={initiateTransfer}
            >
              Initiate month {numberOfPayments + 1} payment
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
TransferForm.displayName = 'TransferForm';
export default TransferForm;

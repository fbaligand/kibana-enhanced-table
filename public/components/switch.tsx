import React from 'react';

import { EuiFormRow, EuiSwitch, EuiIconTip } from '@elastic/eui';

interface SwitchOptionProps<ParamName extends string> {
  'data-test-subj'?: string;
  label?: string;
  icontip?: string;
  disabled?: boolean;
  value?: boolean;
  paramName: ParamName;
  setValue: (paramName: ParamName, value: boolean) => void;
}

function SwitchOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  icontip,
  label,
  disabled,
  paramName,
  value = false,
  setValue,
}: SwitchOptionProps<ParamName>) {
  return (
    <EuiFormRow fullWidth={true}>
      <>
        <EuiSwitch
          compressed
          label={label}
          checked={value}
          disabled={disabled}
          data-test-subj={dataTestSubj}
          onChange={ev => setValue(paramName, ev.target.checked)}
        />
        { icontip && (
          <>
            <span>&nbsp;</span>
            <EuiIconTip
              content={icontip}
              position="right"
            />
          </>
        )}
      </>
    </EuiFormRow>
  );
}

export { SwitchOption };

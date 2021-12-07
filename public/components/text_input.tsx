import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

interface TextInputOptionProps<ParamName extends string> {
  disabled?: boolean;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  isInvalid?: boolean;
  label?: React.ReactNode;
  placeholder?: string;
  paramName: ParamName;
  value?: string;
  'data-test-subj'?: string;
  setValue: (paramName: ParamName, value: string) => void;
}

function TextInputOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  disabled,
  helpText,
  error,
  isInvalid,
  label,
  placeholder,
  paramName,
  value = '',
  setValue,
}: TextInputOptionProps<ParamName>) {
  return (
    <EuiFormRow helpText={helpText} label={label} error={error} isInvalid={isInvalid} fullWidth>
      <EuiFieldText
        compressed
        fullWidth
        isInvalid={isInvalid}
        placeholder={placeholder}
        data-test-subj={dataTestSubj}
        disabled={disabled}
        value={value}
        onChange={ev => setValue(paramName, ev.target.value)}
      />
    </EuiFormRow>
  );
}

export { TextInputOption };

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Alert, Typography } from 'antd';
import dayjs from 'dayjs';
import { syncTimelogFromZymmr } from '../../services/api';

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const MAX_SYNC_DAYS = 10;

const defaultSyncRange = () => [
    dayjs().subtract(MAX_SYNC_DAYS, 'day'),
    dayjs().subtract(1, 'day'),
];

const inclusiveDays = (from, to) => {
    if (!from || !to) return 0;
    return to.startOf('day').diff(from.startOf('day'), 'day') + 1;
};

const rangePresets = () => [
    { label: 'Last 10 days', value: defaultSyncRange() },
    { label: 'Last week', value: [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')] },
];

const SID_STORAGE_KEY = 'zymmr_sid';

const ZymmrSyncModal = ({ open, onCancel, onSynced }) => {
    const [form] = Form.useForm();
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setPicking(null);
        const storedSid = (() => {
            try { return sessionStorage.getItem(SID_STORAGE_KEY) || ''; }
            catch { return ''; }
        })();
        form.setFieldsValue({
            sid: storedSid,
            dateRange: defaultSyncRange(),
        });
    }, [open, form]);

    const disabledDate = (current) => {
        if (!current) return false;
        if (!picking?.[0] && !picking?.[1]) return false;
        const anchor = picking[0] || picking[1];
        if (!anchor) return false;
        return Math.abs(current.startOf('day').diff(anchor.startOf('day'), 'day')) >= MAX_SYNC_DAYS;
    };

    const handleSync = async () => {
        try {
            const values = await form.validateFields();
            const [from, to] = values.dateRange || [];
            if (!from || !to) return;
            setSyncing(true);
            setError(null);
            try {
                sessionStorage.setItem(SID_STORAGE_KEY, values.sid.trim());
            } catch { /* private mode — ignore */ }

            const res = await syncTimelogFromZymmr({
                sid: values.sid.trim(),
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD'),
            });
            onSynced?.(res.data || {});
        } catch (err) {
            if (err?.errorFields) return; // form validation
            const msg = err.response?.data?.Message
                || err.message
                || 'Failed to sync from Zymmr.';
            setError(msg);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Modal
            title="Zymmr Data Sync"
            open={open}
            onCancel={syncing ? undefined : onCancel}
            onOk={handleSync}
            okText="Sync"
            confirmLoading={syncing}
            destroyOnClose
            width={520}
        >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
                Pulls time logs from Zymmr for the selected dates and saves them the same way an Excel upload does.
                Your SID is sent to our backend only to attach as a cookie on the Zymmr request — it is not stored.
            </Paragraph>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            <Form form={form} layout="vertical">
                <Form.Item
                    name="sid"
                    label="Zymmr SID"
                    rules={[{ required: true, message: 'Paste your Zymmr sid cookie' }]}
                    extra={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            While logged into flairminds.zymmr.com, open DevTools → Application → Cookies
                            and copy the <Text code>sid</Text> value.
                        </Text>
                    }
                >
                    <Input.Password
                        placeholder="Paste sid cookie value"
                        autoComplete="off"
                    />
                </Form.Item>
                <Form.Item
                    name="dateRange"
                    label="Date range"
                    extra={<Text type="secondary" style={{ fontSize: 12 }}>Maximum {MAX_SYNC_DAYS} days per sync. Defaults to yesterday back through 10 days.</Text>}
                    rules={[
                        { required: true, message: 'Pick a date range' },
                        {
                            validator: (_, value) => {
                                if (!value?.[0] || !value?.[1]) return Promise.resolve();
                                const days = inclusiveDays(value[0], value[1]);
                                if (days > MAX_SYNC_DAYS) {
                                    return Promise.reject(new Error(`Date range cannot exceed ${MAX_SYNC_DAYS} days`));
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                    <RangePicker
                        style={{ width: '100%' }}
                        presets={rangePresets()}
                        allowClear={false}
                        format="DD MMM YYYY"
                        disabledDate={disabledDate}
                        onCalendarChange={(val) => setPicking(val)}
                        onOpenChange={(openCal) => { if (!openCal) setPicking(null); }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ZymmrSyncModal;

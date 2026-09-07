import React, { useEffect, useState } from 'react';
import { Modal, Form, DatePicker, Alert, Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { syncTimelogFromZymmr, getZymmrLastSync } from '../../services/api';

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const MAX_SYNC_DAYS = 7;

const defaultSyncRange = () => [
    dayjs().subtract(MAX_SYNC_DAYS - 1, 'day'),
    dayjs(),
];

const inclusiveDays = (from, to) => {
    if (!from || !to) return 0;
    return to.startOf('day').diff(from.startOf('day'), 'day') + 1;
};

const rangePresets = () => [
    { label: 'Last 7 days', value: defaultSyncRange() },
    { label: 'Last week', value: [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')] },
];

const ZymmrSyncModal = ({ open, onCancel, onSynced }) => {
    const [form] = Form.useForm();
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setPicking(null);
        form.setFieldsValue({
            dateRange: defaultSyncRange(),
        });
        getZymmrLastSync()
            .then(res => setLastSync(res.data || null))
            .catch(() => setLastSync(null));
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

            const res = await syncTimelogFromZymmr({
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD'),
            });
            setLastSync({ lastSyncedAt: dayjs().toISOString(), source: 'manual' });
            onSynced?.(res.data || {});
        } catch (err) {
            if (err?.errorFields) return;
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
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                Pulls time logs from Zymmr for the selected dates using the configured
                Zymmr service account. Time logs for the last {MAX_SYNC_DAYS} days are also
                synced automatically every day.
            </Paragraph>

            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                {lastSync?.lastSyncedAt ? (
                    <>
                        Last synced{' '}
                        <Text strong style={{ fontSize: 12 }} title={dayjs(lastSync.lastSyncedAt).format('DD MMM YYYY, hh:mm A')}>
                            {dayjs(lastSync.lastSyncedAt).fromNow()}
                        </Text>
                        {lastSync.source ? ` (${lastSync.source})` : ''}
                    </>
                ) : (
                    'No successful Zymmr sync yet.'
                )}
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
                    name="dateRange"
                    label="Date range"
                    extra={<Text type="secondary" style={{ fontSize: 12 }}>Maximum {MAX_SYNC_DAYS} days per sync. Defaults to today back through {MAX_SYNC_DAYS} days.</Text>}
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

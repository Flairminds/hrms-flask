import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

const UnauthorizedPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f0f2f5'
        }}>
            <Result
                status="403"
                title="403 - Access Denied"
                subTitle="Sorry, you don't have permission to access this page."
                extra={
                    <Button type="primary" onClick={() => navigate('/')}>
                        Back to Dashboard
                    </Button>
                }
            />
        </div>
    );
};

export default UnauthorizedPage;

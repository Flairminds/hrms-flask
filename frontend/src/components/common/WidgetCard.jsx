import React from 'react';
import { Card, Typography } from 'antd';
import PropTypes from 'prop-types';

const { Text } = Typography;

/**
 * Reusable Widget Card component for dashboards.
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the widget
 * @param {React.ReactNode} props.icon - Icon to display next to the title
 * @param {string} props.iconColor - Color of the icon
 * @param {React.ReactNode} props.children - Content of the widget
 * @param {Object} props.style - Additional styles for the card
 */
const WidgetCard = ({ title, icon, iconColor = '#1890ff', children, style }) => {
    return (
        <Card
            title={
                <span>
                    {icon && React.cloneElement(icon, { style: { marginRight: '8px', color: iconColor } })}
                    {title}
                </span>
            }
            bordered={false}
            hoverable
            style={{ borderRadius: '8px', height: '100%', ...style }}
        >
            {children}
        </Card>
    );
};

WidgetCard.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.node,
    iconColor: PropTypes.string,
    children: PropTypes.node,
    style: PropTypes.object,
};

export default WidgetCard;

import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Avatar, Input, Button, Tooltip, Card, Tag, Progress, Space, Select, Empty, Spin } from 'antd';
import { 
    ZoomInOutlined, 
    ZoomOutOutlined, 
    FullscreenOutlined, 
    UndoOutlined,
    SearchOutlined,
    TeamOutlined,
    MinusOutlined,
    PlusOutlined,
    MailOutlined,
    UserOutlined,
    CalendarOutlined,
    CloseOutlined
} from '@ant-design/icons';
import { getAllEmployeesList } from '../../services/api';
import styles from './OrganizationStructure.module.css';

// Dimensions configuration for tree layout
const CARD_WIDTH = 200;
const CARD_HEIGHT = 270;
const SIBLING_SPACING = 40;
const LEVEL_SPACING = 90;

const OrganizationStructure = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Canvas transform state: pan (x, y) and zoom
    const [transform, setTransform] = useState({ x: 100, y: 80, zoom: 0.85 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);
    const viewportRef = useRef(null);
    const lastSizeRef = useRef({ width: 0, height: 0 });

    // Collapsed nodes state (Set of employeeIds)
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    
    // Selected employee for detail drawer
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    
    // Highlighted employee (via search focus)
    const [highlightedId, setHighlightedId] = useState(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const res = await getAllEmployeesList();
            // Filter only active employees
            const activeEmps = (res.data || []).filter(emp => 
                emp.employmentStatus && 
                !['Relieved', 'Absconding', 'Resigned'].includes(emp.employmentStatus)
            );
            setEmployees(activeEmps);
            
            // Auto fit screen after tree loads
            setTimeout(() => {
                fitToScreen();
            }, 300);
        } catch (err) {
            console.error("Failed to load employees for org chart", err);
        } finally {
            setLoading(false);
        }
    };

    // Cycle check helper
    const wouldCreateCycle = (empId, parentId, nodeMap) => {
        const visited = new Set();
        let currentId = parentId;
        while (currentId) {
            if (currentId === empId) return true;
            if (visited.has(currentId)) return false; // Cycle detected elsewhere in the chain (not involving empId); return false safely
            visited.add(currentId);
            
            const parentNode = nodeMap[currentId];
            currentId = parentNode ? parentNode.teamLeadId : null;
        }
        return false;
    };

    // Build the hierarchical tree and calculate coordinates
    const buildAndLayoutTree = () => {
        if (employees.length === 0) return { nodesList: [], connections: [] };

        // 1. Map flat list to node structures
        const nodeMap = {};
        employees.forEach(emp => {
            nodeMap[emp.employeeId] = {
                ...emp,
                children: [],
                x: 0,
                y: 0,
                subtreeWidth: 0,
                level: 0
            };
        });

        // 2. Build relationships & find roots
        const roots = [];
        employees.forEach(emp => {
            const node = nodeMap[emp.employeeId];
            const parentId = emp.teamLeadId;
            
            // Check valid parent and prevent loops
            if (parentId && nodeMap[parentId] && !wouldCreateCycle(emp.employeeId, parentId, nodeMap)) {
                nodeMap[parentId].children.push(node);
            } else {
                roots.push(node);
            }
        });

        // 3. Compute subtree widths (recursive post-order)
        const computeSubtreeWidth = (node) => {
            if (collapsedNodes.has(node.employeeId) || node.children.length === 0) {
                node.subtreeWidth = CARD_WIDTH;
                return CARD_WIDTH;
            }

            let totalWidth = 0;
            node.children.forEach(child => {
                totalWidth += computeSubtreeWidth(child);
            });
            totalWidth += SIBLING_SPACING * (node.children.length - 1);
            
            node.subtreeWidth = Math.max(CARD_WIDTH, totalWidth);
            return node.subtreeWidth;
        };

        roots.forEach(root => computeSubtreeWidth(root));

        // 4. Assign Coordinates (recursive pre-order)
        const assignCoords = (node, x, y, level) => {
            node.x = x;
            node.y = y;
            node.level = level;

            if (collapsedNodes.has(node.employeeId) || node.children.length === 0) {
                return;
            }

            let totalChildrenWidth = 0;
            node.children.forEach(child => {
                totalChildrenWidth += child.subtreeWidth;
            });
            totalChildrenWidth += SIBLING_SPACING * (node.children.length - 1);

            // Starting point for children subtrees (left-aligned)
            let startX = x - totalChildrenWidth / 2 + CARD_WIDTH / 2;

            node.children.forEach(child => {
                const childX = startX + child.subtreeWidth / 2 - CARD_WIDTH / 2;
                const childY = y + LEVEL_SPACING + CARD_HEIGHT;
                assignCoords(child, childX, childY, level + 1);
                startX += child.subtreeWidth + SIBLING_SPACING;
            });
        };

        let currentTreeX = 0;
        roots.forEach(root => {
            assignCoords(root, currentTreeX + root.subtreeWidth / 2 - CARD_WIDTH / 2, 0, 0);
            currentTreeX += root.subtreeWidth + SIBLING_SPACING * 3;
        });

        // 5. Flatten the positioned nodes and build curved connections
        const nodesList = [];
        const connections = [];

        const collectNodesAndConnections = (node) => {
            nodesList.push(node);

            if (collapsedNodes.has(node.employeeId)) return;

            node.children.forEach(child => {
                // Curved connection from parent bottom to child top
                const parentBottomX = node.x + CARD_WIDTH / 2;
                const parentBottomY = node.y + CARD_HEIGHT;
                const childTopX = child.x + CARD_WIDTH / 2;
                const childTopY = child.y;
                
                const deltaY = LEVEL_SPACING / 2;
                const pathData = `M ${parentBottomX} ${parentBottomY} C ${parentBottomX} ${parentBottomY + deltaY}, ${childTopX} ${childTopY - deltaY}, ${childTopX} ${childTopY}`;
                
                connections.push({
                    id: `${node.employeeId}-to-${child.employeeId}`,
                    parentId: node.employeeId,
                    childId: child.employeeId,
                    d: pathData
                });

                collectNodesAndConnections(child);
            });
        };

        roots.forEach(root => collectNodesAndConnections(root));

        return { nodesList, connections };
    };

    const { nodesList, connections } = buildAndLayoutTree();

    // Toggle expand/collapse of reporting subtree
    const toggleNodeCollapse = (e, employeeId) => {
        e.stopPropagation();
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(employeeId)) {
                next.delete(employeeId);
            } else {
                next.add(employeeId);
            }
            return next;
        });
    };

    // Zoom & Pan Handlers
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Left click only
        setIsDragging(true);
        dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        console.log("Org Chart Mouse Down:", { clientX: e.clientX, clientY: e.clientY, transform });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        setTransform(prev => ({
            ...prev,
            x: newX,
            y: newY
        }));
        console.log("Org Chart Drag Panning:", { newX, newY });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            console.log("Org Chart Drag End");
        }
    };

    const handleWheel = (e) => {
        try {
            e.preventDefault();
        } catch (err) {
            // Ignore passive event listener errors safely
        }
        const zoomIntensity = 0.05;
        const rect = viewportRef.current.getBoundingClientRect();
        
        // Calculate mouse relative coordinates
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);

        // Center zoom on mouse point using functional update to avoid stale closures
        setTransform(prev => {
            const nextZoom = Math.min(2.0, Math.max(0.15, prev.zoom * zoomFactor));
            return {
                zoom: nextZoom,
                x: mouseX - (mouseX - prev.x) * (nextZoom / prev.zoom),
                y: mouseY - (mouseY - prev.y) * (nextZoom / prev.zoom)
            };
        });
    };

    // Canvas adjustment helper utilities
    const handleZoomIn = () => {
        setTransform(prev => ({ ...prev, zoom: Math.min(2.0, prev.zoom + 0.1) }));
    };

    const handleZoomOut = () => {
        setTransform(prev => ({ ...prev, zoom: Math.max(0.15, prev.zoom - 0.1) }));
    };

    const handleReset = () => {
        fitToScreen();
    };

    const fitToScreen = (customList) => {
        const listToUse = customList || nodesList;
        if (listToUse.length === 0) return;
 
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        listToUse.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x + CARD_WIDTH > maxX) maxX = n.x + CARD_WIDTH;
            if (n.y < minY) minY = n.y;
            if (n.y + CARD_HEIGHT > maxY) maxY = n.y + CARD_HEIGHT;
        });

        const treeW = maxX - minX;
        const treeH = maxY - minY;
        const viewportW = viewportRef.current?.clientWidth || 800;
        const viewportH = viewportRef.current?.clientHeight || 600;

        const zoomX = viewportW / (treeW + 150);
        const zoomY = viewportH / (treeH + 150);
        const fitZoom = Math.min(0.55, Math.max(0.15, Math.min(zoomX, zoomY)));

        // Center coordinates
        const xOffset = (viewportW - treeW * fitZoom) / 2 - minX * fitZoom;
        const yOffset = (viewportH - treeH * fitZoom) / 2 - minY * fitZoom;

        setTransform({
            x: xOffset,
            y: yOffset,
            zoom: fitZoom
        });
    };

    // Card Selection -> Drawer opening
    const handleCardClick = (employee) => {
        setSelectedEmployee(employee);
        setIsDrawerVisible(true);
    };

    // Search and auto-focus employee node
    const handleSearchSelect = (employeeId) => {
        const targetNode = nodesList.find(n => n.employeeId === employeeId);
        if (!targetNode) {
            // Node might be hidden inside a collapsed parent. Let's expand all its ancestors!
            expandAncestors(employeeId);
            return;
        }

        focusOnNode(targetNode);
    };

    const expandAncestors = (employeeId) => {
        const flatMap = {};
        employees.forEach(e => { flatMap[e.employeeId] = e; });

        const visited = new Set();
        let currentId = employeeId;
        const parentsToExpand = [];

        while (currentId) {
            if (visited.has(currentId)) break;
            visited.add(currentId);

            const parent = flatMap[currentId];
            if (parent && parent.teamLeadId) {
                parentsToExpand.push(parent.teamLeadId);
                currentId = parent.teamLeadId;
            } else {
                break;
            }
        }

        if (parentsToExpand.length > 0) {
            setCollapsedNodes(prev => {
                const next = new Set(prev);
                parentsToExpand.forEach(pId => next.delete(pId));
                return next;
            });

            // Wait for re-render coordinates calculation, then focus
            setTimeout(() => {
                // Fetch the nodes list again from fresh layout
                const freshLayout = buildAndLayoutTree();
                const target = freshLayout.nodesList.find(n => n.employeeId === employeeId);
                if (target) focusOnNode(target);
            }, 100);
        }
    };

    const focusOnNode = (node) => {
        const viewportW = viewportRef.current?.clientWidth || 800;
        const viewportH = viewportRef.current?.clientHeight || 600;

        const zoomLevel = 1.0; // Zoom in to details
        const targetX = viewportW / 2 - (node.x + CARD_WIDTH / 2) * zoomLevel;
        const targetY = viewportH / 2 - (node.y + CARD_HEIGHT / 2) * zoomLevel;

        setTransform({
            x: targetX,
            y: targetY,
            zoom: zoomLevel
        });

        // Trigger flash border animation
        setHighlightedId(node.employeeId);
        setTimeout(() => {
            setHighlightedId(null);
        }, 2000);
    };

    // Get Avatar background gradient based on Name
    const getInitialsGradient = (name) => {
        const colors = [
            'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            'linear-gradient(135deg, #3f51b5 0%, #00bcd4 100%)',
            'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            'linear-gradient(135deg, #e91e63 0%, #ff5722 100%)',
            'linear-gradient(135deg, #795548 0%, #ff9800 100%)',
            'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const getStatusTagColor = (status) => {
        switch (status) {
            case 'Confirmed': return 'green';
            case 'Intern': return 'purple';
            case 'Probation': return 'orange';
            case 'Leave Without Pay': return 'red';
            default: return 'blue';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Confirmed':
            case 'Active':
                return '#10b981'; // emerald green
            case 'Probation':
                return '#f59e0b'; // amber orange
            case 'Intern':
                return '#8b5cf6'; // purple
            case 'Leave Without Pay':
            case 'Resigned':
                return '#ef4444'; // red
            default:
                return '#3b82f6'; // blue
        }
    };

    const getAvatarInitials = (name) => {
        if (!name) return '';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // ResizeObserver to handle tab visibility changes and dynamically fit canvas to screen size!
    useEffect(() => {
        if (!viewportRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    const sizeChanged = width !== lastSizeRef.current.width || height !== lastSizeRef.current.height;
                    if (sizeChanged && employees.length > 0) {
                        lastSizeRef.current = { width, height };
                        fitToScreen();
                    }
                }
            }
        });

        resizeObserver.observe(viewportRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [employees]);

    return (
        <div className={styles.container}>
            {/* Upper controls bar */}
            <div className={styles.controlsBar}>
                <div className={styles.searchSection}>
                    <Select
                        showSearch
                        placeholder="Search employee to locate in chart..."
                        optionFilterProp="children"
                        className={styles.searchSelect}
                        onChange={handleSearchSelect}
                        suffixIcon={<SearchOutlined />}
                        filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={employees.map(emp => ({
                            value: emp.employeeId,
                            label: `${emp.employeeDisplayName} (${emp.subRoleName || emp.roleName || 'Employee'})`
                        }))}
                    />
                </div>

                <div className={styles.btnGroup}>
                    <Tooltip title="Zoom In">
                        <Button shape="circle" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
                    </Tooltip>
                    <Tooltip title="Zoom Out">
                        <Button shape="circle" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
                    </Tooltip>
                    <Tooltip title="Reset View">
                        <Button shape="circle" icon={<UndoOutlined />} onClick={handleReset} />
                    </Tooltip>
                    <Tooltip title="Fit Canvas to Screen">
                        <Button shape="circle" icon={<FullscreenOutlined />} onClick={() => fitToScreen()} />
                    </Tooltip>
                </div>
            </div>

            {/* Tree Viewport Area */}
            <div 
                ref={viewportRef}
                className={styles.viewport}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {loading ? (
                    <div className={styles.loaderContainer}>
                        <Spin size="large" tip="Constructing Organization Flow Chart..." />
                    </div>
                ) : employees.length === 0 ? (
                    <Empty description="No active employee records found." />
                ) : (
                    <div 
                        ref={canvasRef}
                        className={styles.canvas}
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                    >
                        {/* 1. Curved connections rendered as SVGs in background */}
                        <svg className={styles.svgLayer} width="100%" height="100%">
                            <defs>
                                <marker
                                    id="arrowhead"
                                    viewBox="0 0 10 10"
                                    refX="8"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1890ff" opacity="0.6"/>
                                </marker>
                            </defs>
                            {connections.map(conn => {
                                const isHighlighted = highlightedId === conn.childId || highlightedId === conn.parentId;
                                return (
                                    <path
                                        key={conn.id}
                                        d={conn.d}
                                        className={`${styles.connectorLine} ${isHighlighted ? styles.highlightedConnector : ''}`}
                                    />
                                );
                            })}
                        </svg>

                        {/* 2. Employee Cards in Foreground */}
                        {nodesList.map(node => {
                            const avatarGrad = getInitialsGradient(node.employeeDisplayName);
                            const isNodeHighlighted = highlightedId === node.employeeId;
                            const isCollapsed = collapsedNodes.has(node.employeeId);
                            const hasChildren = node.children.length > 0;

                            return (
                                <div 
                                    key={node.employeeId}
                                    className={`${styles.cardWrapper} ${isNodeHighlighted ? styles.highlightedCard : ''}`}
                                    style={{
                                        left: node.x,
                                        top: node.y,
                                        width: CARD_WIDTH,
                                        height: CARD_HEIGHT
                                    }}
                                    onClick={() => handleCardClick(node)}
                                >
                                    <div className={styles.employeeCard}>
                                        {/* Large Profile Picture / Initials Block */}
                                        <div className={styles.cardImageContainer}>
                                            {node.profileImage ? (
                                                <img 
                                                    src={node.profileImage} 
                                                    alt={node.employeeDisplayName} 
                                                    className={styles.largeCardImage}
                                                />
                                            ) : (
                                                <div 
                                                    className={styles.largeCardInitials}
                                                    style={{ background: avatarGrad }}
                                                >
                                                    {getAvatarInitials(node.employeeDisplayName)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Brief details section */}
                                        <div className={styles.cardBrief}>
                                            <div className={styles.nameRow}>
                                                <h4 className={styles.empName} title={node.employeeDisplayName}>
                                                    {node.employeeDisplayName}
                                                </h4>
                                                <span 
                                                    className={styles.statusDot} 
                                                    style={{ backgroundColor: getStatusColor(node.employmentStatus) }}
                                                    title={`Status: ${node.employmentStatus || 'Active'}`}
                                                ></span>
                                            </div>
                                            <span className={styles.empDesignation} title={node.designationName || node.subRoleName || 'Employee'}>
                                                {node.designationName || node.subRoleName || node.roleName || 'Employee'}
                                            </span>
                                            <div className={styles.statusRow}>
                                                <span className={`${styles.statusBadge} ${styles[(node.employmentStatus || 'active').toLowerCase().replace(/\s+/g, '')]}`}>
                                                    {node.employmentStatus || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expand/Collapse round trigger at the bottom */}
                                    {hasChildren && (
                                        <div 
                                            className={styles.collapseToggle}
                                            onClick={(e) => toggleNodeCollapse(e, node.employeeId)}
                                        >
                                            {isCollapsed ? (
                                                <span className={styles.childCount}>+{node.children.length}</span>
                                            ) : (
                                                <MinusOutlined className={styles.minusIcon} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Profile Drawer detailing information */}
            <Drawer
                title="Employee Information Details"
                placement="right"
                width={400}
                onClose={() => setIsDrawerVisible(false)}
                open={isDrawerVisible}
                extra={
                    <Button 
                        type="text" 
                        icon={<CloseOutlined />} 
                        onClick={() => setIsDrawerVisible(false)} 
                    />
                }
                closable={false}
                styles={{ body: { padding: 24 } }}
            >
                {selectedEmployee && (
                    <div className={styles.drawerContainer}>
                        {/* Drawer Header Profile */}
                        <div className={styles.drawerHeader}>
                            <Avatar
                                size={76}
                                src={selectedEmployee.profileImage}
                                style={{ 
                                    background: getInitialsGradient(selectedEmployee.employeeDisplayName), 
                                    fontWeight: 'bold',
                                    fontSize: 26,
                                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)'
                                }}
                            >
                                {getAvatarInitials(selectedEmployee.employeeDisplayName)}
                            </Avatar>
                            <h3 className={styles.drawerName}>{selectedEmployee.employeeDisplayName}</h3>
                            <Tag color={getStatusTagColor(selectedEmployee.employmentStatus)} style={{ marginTop: 6, fontSize: 13, padding: '2px 8px' }}>
                                {selectedEmployee.employmentStatus}
                            </Tag>
                        </div>

                        {/* Profile Completion Circle */}
                        <div className={styles.completionCircle}>
                            <Space direction="vertical" align="center" size="small">
                                <Progress
                                    type="circle"
                                    percent={selectedEmployee.profileCompletion?.completion_percentage || 0}
                                    size={80}
                                    strokeWidth={7}
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                />
                                <span className={styles.completionLabel}>Profile Complete</span>
                            </Space>
                        </div>

                        <hr className={styles.divider} />

                        {/* Details Fields list */}
                        <div className={styles.detailsList}>
                            <div className={styles.detailItem}>
                                <UserOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Employee ID</span>
                                    <span className={styles.detailValue}>{selectedEmployee.employeeId}</span>
                                </div>
                            </div>
                            
                            <div className={styles.detailItem}>
                                <TeamOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Designation / Professional Title</span>
                                    <span className={styles.detailValue}>
                                        {selectedEmployee.designationName || selectedEmployee.subRoleName || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <TeamOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>System Role Permission</span>
                                    <span className={styles.detailValue}>{selectedEmployee.roleName || 'Employee'}</span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <MailOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Work Email Address</span>
                                    <span className={styles.detailValue}>
                                        {selectedEmployee.email ? (
                                            <a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a>
                                        ) : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <CalendarOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Date of Joining</span>
                                    <span className={styles.detailValue}>
                                        {selectedEmployee.joiningDate ? (
                                            new Date(selectedEmployee.joiningDate).toLocaleDateString('en-US', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })
                                        ) : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <UserOutlined className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Reporting Manager / Team Lead</span>
                                    <span className={styles.detailValue}>{selectedEmployee.teamLeadName || 'None'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Direct Reports Panel */}
                        {selectedEmployee.children && selectedEmployee.children.length > 0 && (
                            <>
                                <hr className={styles.divider} />
                                <div className={styles.reportsSection}>
                                    <h4 className={styles.reportsTitle}>Direct Reports ({selectedEmployee.children.length})</h4>
                                    <div className={styles.reportsList}>
                                        {selectedEmployee.children.map(child => (
                                            <div 
                                                key={child.employeeId} 
                                                className={styles.reportRow}
                                                onClick={() => {
                                                    setSelectedEmployee(child);
                                                    focusOnNode(child);
                                                }}
                                            >
                                                <Avatar 
                                                    size="small" 
                                                    src={child.profileImage}
                                                    style={{ background: getInitialsGradient(child.employeeDisplayName), marginRight: 8, fontSize: 10 }}
                                                >
                                                    {getAvatarInitials(child.employeeDisplayName)}
                                                </Avatar>
                                                <div className={styles.reportRowInfo}>
                                                    <span className={styles.reportRowName}>{child.employeeDisplayName}</span>
                                                    <span className={styles.reportRowDesig}>{child.designationName || child.subRoleName || 'Employee'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default OrganizationStructure;

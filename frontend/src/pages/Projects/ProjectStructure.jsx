import React, { useState, useEffect, useRef } from 'react';
import { 
    Spin, 
    Empty, 
    Button, 
    Input, 
    Select, 
    Tooltip, 
    Drawer, 
    Avatar, 
    Tag, 
    Progress, 
    Divider 
} from 'antd';
import { 
    ZoomInOutlined, 
    ZoomOutOutlined, 
    UndoOutlined, 
    FullscreenOutlined,
    SearchOutlined,
    ProjectOutlined,
    UserOutlined,
    SolutionOutlined,
    CalendarOutlined,
    TeamOutlined,
    CloseOutlined
} from '@ant-design/icons';
import { getProjectStructureList } from '../../services/api';
import styles from './ProjectStructure.module.css';

// Layout Constants
const CARD_WIDTH = 250;
const CARD_HEIGHT = 100;
const LEVEL_SPACING = 80;   // Horizontal gap between levels (from left to right)
const SIBLING_SPACING = 20; // Tight vertical gap between stacked sibling cards

export default function ProjectStructure() {
    const [loading, setLoading] = useState(true);
    const [projectData, setProjectData] = useState([]);
    
    // Interactive Canvas States
    const [transform, setTransform] = useState({ x: 100, y: 80, zoom: 0.75 });
    const [isDragging, setIsDragging] = useState(false);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [highlightedId, setHighlightedId] = useState(null);
    const [searchVal, setSearchVal] = useState(undefined);

    // Selected Drawers States
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Viewport Refs
    const viewportRef = useRef(null);
    const canvasRef = useRef(null);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        loadProjectStructure();
    }, []);

    const loadProjectStructure = async () => {
        setLoading(true);
        try {
            const res = await getProjectStructureList();
            const data = res.data || [];
            setProjectData(data);
            
            // Keep project cards expanded to show lead cards, but keep lead cards (hiding members) collapsed by default
            const initialCollapsed = new Set();
            data.forEach(proj => {
                const projNodeId = `proj-${proj.projectId}`;
                const hasLead = !!proj.lead;
                const hasMembers = (proj.members || []).length > 0;

                if (!hasLead && hasMembers) {
                    // If no lead exists, collapse project node to hide direct members by default
                    initialCollapsed.add(projNodeId);
                }

                if (proj.lead) {
                    const leadNodeId = `lead-${proj.lead.employeeId}-${proj.projectId}`;
                    const hasAllocatedMembers = (proj.members || []).some(m => m.employeeId !== proj.lead.employeeId);
                    if (hasAllocatedMembers) {
                        // Collapse lead card to hide allocated members by default
                        initialCollapsed.add(leadNodeId);
                    }
                }
            });
            setCollapsedNodes(initialCollapsed);

            // Auto fit screen after a short delay
            setTimeout(() => {
                fitToScreen();
            }, 300);
        } catch (err) {
            console.error("Failed to load project structure", err);
        } finally {
            setLoading(false);
        }
    };

    // Cycle check helper to prevent circular loops
    const wouldCreateCycle = (empId, parentId, nodeMap) => {
        const visited = new Set();
        let currentId = parentId;
        while (currentId) {
            if (currentId === empId) return true;
            if (visited.has(currentId)) return false; 
            visited.add(currentId);
            
            const parentNode = nodeMap[currentId];
            currentId = parentNode ? parentNode.teamLeadId : null;
        }
        return false;
    };

    // ----------------------------------------------------
    // Tree Position & Hierarchy Coordinate Generator
    // ----------------------------------------------------
    const buildAndLayoutTree = () => {
        if (projectData.length === 0) return { nodesList: [], connections: [] };

        const roots = [];
        const allNodesMap = {};

        // 1. Build project root nodes
        projectData.forEach(proj => {
            const projNodeId = `proj-${proj.projectId}`;
            const projNode = {
                id: projNodeId,
                type: 'project',
                projectId: proj.projectId,
                projectName: proj.projectName,
                client: proj.client || 'Unknown Client',
                description: proj.description,
                startDate: proj.startDate,
                endDate: proj.endDate,
                projectStatus: proj.projectStatus,
                children: [],
                x: 0,
                y: 0,
                subtreeWidth: 0,
                level: 0
            };
            roots.push(projNode);
            allNodesMap[projNodeId] = projNode;

            let leadNode = null;
            // 2. Build Lead node if lead exists
            if (proj.lead) {
                const leadNodeId = `lead-${proj.lead.employeeId}-${proj.projectId}`;
                leadNode = {
                    id: leadNodeId,
                    type: 'lead',
                    projectId: proj.projectId,
                    employeeId: proj.lead.employeeId,
                    employeeName: proj.lead.employeeName,
                    employeeDisplayName: proj.lead.employeeDisplayName,
                    roleName: proj.lead.roleName,
                    subRoleName: proj.lead.subRoleName,
                    designationName: proj.lead.designationName,
                    employmentStatus: proj.lead.employmentStatus,
                    email: proj.lead.email,
                    profileCompletion: proj.lead.profileCompletion,
                    children: [],
                    x: 0,
                    y: 0,
                    subtreeWidth: 0,
                    level: 1
                };
                projNode.children.push(leadNode);
                allNodesMap[leadNodeId] = leadNode;
            }

            // 3. Build allocated active members
            (proj.members || []).forEach(m => {
                // Skip lead in members list to avoid repeating nodes
                if (proj.lead && m.employeeId === proj.lead.employeeId) return;

                const memberNodeId = `member-${m.employeeId}-${proj.projectId}`;
                const memberNode = {
                    id: memberNodeId,
                    type: 'member',
                    projectId: proj.projectId,
                    employeeId: m.employeeId,
                    employeeName: m.employeeName,
                    employeeDisplayName: m.employeeDisplayName,
                    roleName: m.roleName,
                    subRoleName: m.subRoleName,
                    designationName: m.designationName,
                    employmentStatus: m.employmentStatus,
                    email: m.email,
                    projectAllocation: m.projectAllocation,
                    employeeRole: m.employeeRole,
                    profileCompletion: m.profileCompletion,
                    children: [],
                    x: 0,
                    y: 0,
                    subtreeWidth: 0,
                    level: leadNode ? 2 : 1
                };

                allNodesMap[memberNodeId] = memberNode;

                if (leadNode) {
                    leadNode.children.push(memberNode);
                } else {
                    projNode.children.push(memberNode);
                }
            });
        });

        // 2. Measure vertical subtree heights recursively (for layout calculation in left-to-right trees)
        const calculateSubtreeHeight = (node) => {
            if (collapsedNodes.has(node.id) || node.children.length === 0) {
                node.subtreeHeight = CARD_HEIGHT;
                return CARD_HEIGHT;
            }
            
            let childrenHeight = 0;
            node.children.forEach(child => {
                childrenHeight += calculateSubtreeHeight(child);
            });
            childrenHeight += SIBLING_SPACING * (node.children.length - 1);
            
            node.subtreeHeight = Math.max(CARD_HEIGHT, childrenHeight);
            return node.subtreeHeight;
        };

        roots.forEach(root => calculateSubtreeHeight(root));

        // 3. Coordinate Assignment (horizontal pipeline growth from left to right)
        const assignCoords = (node, x, y, level) => {
            node.x = x;
            node.y = y;
            node.level = level;

            if (collapsedNodes.has(node.id) || node.children.length === 0) return;

            let totalChildrenHeight = 0;
            node.children.forEach(child => {
                totalChildrenHeight += child.subtreeHeight;
            });
            totalChildrenHeight += SIBLING_SPACING * (node.children.length - 1);

            // Center child branches vertically on the right side of the parent card
            let startY = y - totalChildrenHeight / 2 + CARD_HEIGHT / 2;

            node.children.forEach(child => {
                const childX = x + CARD_WIDTH + LEVEL_SPACING;
                const childY = startY + child.subtreeHeight / 2 - CARD_HEIGHT / 2;
                assignCoords(child, childX, childY, level + 1);
                startY += child.subtreeHeight + SIBLING_SPACING;
            });
        };

        // Stack separate project trees vertically
        let currentY = 0;
        const PROJECT_GAP = 70; // Vertical gap between separate project trees

        roots.forEach(root => {
            // Center root horizontally at x = 0, vertically starting at currentY
            assignCoords(root, 0, currentY, 0);

            // Measure actual y bounds reached by this tree (including children offsets)
            let minY = Infinity;
            let maxY = -Infinity;
            const measureRange = (n) => {
                if (n.y < minY) minY = n.y;
                if (n.y > maxY) maxY = n.y;
                if (collapsedNodes.has(n.id)) return;
                n.children.forEach(measureRange);
            };
            measureRange(root);

            // Offset the tree vertically so the highest child perfectly aligns with currentY
            const shiftY = currentY - minY;
            const applyShift = (n) => {
                n.y += shiftY;
                if (collapsedNodes.has(n.id)) return;
                n.children.forEach(applyShift);
            };
            applyShift(root);

            // Shift currentY to stack the next project under this tree's lowest bottom edge
            currentY = (maxY + shiftY) + CARD_HEIGHT + PROJECT_GAP;
        });

        // 4. Flatten nodes and establish curved horizontal reporting connections
        const nodesList = [];
        const connections = [];

        const collectNodesAndConnections = (node) => {
            nodesList.push(node);
            if (collapsedNodes.has(node.id)) return;

            node.children.forEach(child => {
                const parentRightX = node.x + CARD_WIDTH;
                const parentRightY = node.y + CARD_HEIGHT / 2;
                const childLeftX = child.x;
                const childLeftY = child.y + CARD_HEIGHT / 2;

                const deltaX = LEVEL_SPACING / 2;
                const pathData = `M ${parentRightX} ${parentRightY} C ${parentRightX + deltaX} ${parentRightY}, ${childLeftX - deltaX} ${childLeftY}, ${childLeftX} ${childLeftY}`;

                connections.push({
                    id: `${node.id}-to-${child.id}`,
                    parentId: node.id,
                    childId: child.id,
                    d: pathData
                });

                collectNodesAndConnections(child);
            });
        };

        roots.forEach(root => collectNodesAndConnections(root));

        return { nodesList, connections, allNodesMap };
    };

    const { nodesList, connections, allNodesMap } = buildAndLayoutTree();

    // ----------------------------------------------------
    // Drag & Zoom Panning Controls
    // ----------------------------------------------------
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Left click only
        setIsDragging(true);
        dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        console.log("Proj Chart Mouse Down:", { clientX: e.clientX, clientY: e.clientY, transform });
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
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            console.log("Proj Chart Drag End");
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
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
        const nextZoom = Math.min(2.0, Math.max(0.15, transform.zoom * zoomFactor));

        setTransform(prev => ({
            zoom: nextZoom,
            x: mouseX - (mouseX - prev.x) * (nextZoom / prev.zoom),
            y: mouseY - (mouseY - prev.y) * (nextZoom / prev.zoom)
        }));
    };

    const handleZoomIn = () => {
        setTransform(prev => ({ ...prev, zoom: Math.min(2.0, prev.zoom + 0.1) }));
    };

    const handleZoomOut = () => {
        setTransform(prev => ({ ...prev, zoom: Math.max(0.15, prev.zoom - 0.1) }));
    };

    const handleReset = () => {
        setTransform({ x: 100, y: 80, zoom: 0.75 });
        setCollapsedNodes(new Set());
        setHighlightedId(null);
        setSearchVal(undefined);
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
        const fitZoom = Math.min(1.2, Math.max(0.3, Math.min(zoomX, zoomY)));

        const xOffset = (viewportW - treeW * fitZoom) / 2 - minX * fitZoom;
        const yOffset = (viewportH - treeH * fitZoom) / 2 - minY * fitZoom;

        setTransform({
            x: xOffset,
            y: yOffset,
            zoom: fitZoom
        });
    };

    // ----------------------------------------------------
    // Search Autocomplete Focus & centering
    // ----------------------------------------------------
    const expandAncestors = (nodeId) => {
        const parentsToExpand = [];
        const visited = new Set();
        let currentId = nodeId;

        // Traverse project structures to find parent nodes
        while (currentId) {
            if (visited.has(currentId)) break;
            visited.add(currentId);

            // In project structure: Lead parent is the project; Member parent is the lead (or project).
            // Parse from nodeId prefix
            if (currentId.startsWith('member-')) {
                const parts = currentId.split('-');
                const empId = parts[1];
                const projId = parts[2];
                
                // Parent lead node ID
                const potentialLeadId = `lead-${projId}`; // Just parse matching nodes
                const matchingLead = Object.keys(allNodesMap).find(k => k.startsWith('lead-') && k.endsWith(`-${projId}`));
                if (matchingLead) {
                    parentsToExpand.push(matchingLead);
                    currentId = matchingLead;
                } else {
                    const matchingProj = `proj-${projId}`;
                    parentsToExpand.push(matchingProj);
                    currentId = matchingProj;
                }
            } else if (currentId.startsWith('lead-')) {
                const parts = currentId.split('-');
                const projId = parts[2];
                const matchingProj = `proj-${projId}`;
                parentsToExpand.push(matchingProj);
                currentId = matchingProj;
            } else {
                break; // project roots have no parents
            }
        }

        if (parentsToExpand.length > 0) {
            setCollapsedNodes(prev => {
                const next = new Set(prev);
                parentsToExpand.forEach(p => next.delete(p));
                return next;
            });
        }
    };

    const focusOnNode = (node) => {
        const viewportW = viewportRef.current?.clientWidth || 800;
        const viewportH = viewportRef.current?.clientHeight || 600;

        const targetZoom = 0.85;
        const targetX = viewportW / 2 - (node.x + CARD_WIDTH / 2) * targetZoom;
        const targetY = viewportH / 2 - (node.y + CARD_HEIGHT / 2) * targetZoom;

        setTransform({
            x: targetX,
            y: targetY,
            zoom: targetZoom
        });

        setHighlightedId(node.id);
        // Remove highlight animation after 4.5 seconds
        setTimeout(() => {
            setHighlightedId(null);
        }, 4500);
    };

    const handleSearchSelect = (val) => {
        setSearchVal(val);
        if (!val) return;

        expandAncestors(val);

        // A small delay to let state collapse complete and coordinates recalculate
        setTimeout(() => {
            const freshTree = buildAndLayoutTree();
            const target = freshTree.allNodesMap[val];
            if (target) {
                focusOnNode(target);
            }
        }, 100);
    };

    // ----------------------------------------------------
    // Node Click Drawers
    // ----------------------------------------------------
    const handleCardClick = (node) => {
        if (node.type === 'project') {
            const rawProj = projectData.find(p => p.projectId === node.projectId);
            setSelectedProject(rawProj);
        } else {
            setSelectedEmployee(node);
        }
    };

    const handleToggleCollapse = (e, nodeId) => {
        e.stopPropagation();
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    // Search Options List
    const getSearchOptions = () => {
        const options = [];
        projectData.forEach(proj => {
            options.push({
                value: `proj-${proj.projectId}`,
                label: `Project: ${proj.projectName} [${proj.client || 'Client'}]`,
                type: 'project'
            });

            if (proj.lead) {
                options.push({
                    value: `lead-${proj.lead.employeeId}-${proj.projectId}`,
                    label: `Lead: ${proj.lead.employeeDisplayName} (${proj.projectName})`,
                    type: 'lead'
                });
            }

            (proj.members || []).forEach(m => {
                if (proj.lead && m.employeeId === proj.lead.employeeId) return;
                options.push({
                    value: `member-${m.employeeId}-${proj.projectId}`,
                    label: `Member: ${m.employeeDisplayName} (${proj.projectName} - ${m.employeeRole || 'Engineer'})`,
                    type: 'member'
                });
            });
        });
        return options;
    };

    // Colors/Classes utilities
    const getStatusTagColor = (status) => {
        switch (status) {
            case 'Active': return 'green';
            case 'Intern': return 'orange';
            case 'Probation': return 'blue';
            case 'Future Prospect': return 'purple';
            default: return 'gray';
        }
    };

    const getAvatarInitials = (name) => {
        if (!name) return 'EMP';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const getInitialsGradient = (name) => {
        if (!name) return 'linear-gradient(135deg, #1890ff, #096dd9)';
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue1 = hash % 360;
        const hue2 = (hash + 60) % 360;
        return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%))`;
    };

    return (
        <div className={styles.container}>
            {/* Top Toolbar Controls */}
            <div className={styles.controlsBar}>
                <div className={styles.searchBox}>
                    <Select
                        showSearch
                        value={searchVal}
                        placeholder="Search Project or Allocated Employee..."
                        className={styles.searchInput}
                        suffixIcon={<SearchOutlined />}
                        filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={handleSearchSelect}
                        options={getSearchOptions()}
                    />
                    {searchVal && (
                        <Button 
                            type="text" 
                            shape="circle" 
                            icon={<CloseOutlined />} 
                            className={styles.clearSearchBtn}
                            onClick={() => { setSearchVal(undefined); setHighlightedId(null); }}
                        />
                    )}
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
                        <Spin size="large" tip="Constructing Project Allocations Flow Chart..." />
                    </div>
                ) : projectData.length === 0 ? (
                    <Empty description="No active project structures found." />
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

                        {/* 2. Project & Employee Cards in Foreground */}
                        {nodesList.map(node => {
                            const isNodeHighlighted = highlightedId === node.id;
                            const isCollapsed = collapsedNodes.has(node.id);
                            const hasChildren = node.children.length > 0;

                            if (node.type === 'project') {
                                // Project Root Card Rendering
                                return (
                                    <div 
                                        key={node.id}
                                        className={`${styles.cardWrapper} ${isNodeHighlighted ? styles.highlightedCard : ''}`}
                                        style={{
                                            left: node.x,
                                            top: node.y,
                                            width: CARD_WIDTH,
                                            height: CARD_HEIGHT
                                        }}
                                        onClick={() => handleCardClick(node)}
                                    >
                                        <div className={`${styles.projCard} ${styles.baseCard}`}>
                                            <div className={styles.projHeader}>
                                                {/* <ProjectOutlined className={styles.projIcon} /> */}
                                                <h4 className={styles.projName}>{node.projectName}</h4>
                                                <Tag color={getStatusTagColor(node.projectStatus)} className={styles.projStatusTag}>
                                                    {node.projectStatus}
                                                </Tag>
                                            </div>
                                            <div className={styles.projClient}>Client: {node.client}</div>
                                            <div className={styles.projBrief}>
                                                <span>Active Staff: {(projectData.find(p => p.projectId === node.projectId)?.members || []).length}</span>
                                            </div>

                                            {/* Subtree Expand/Collapse Trigger */}
                                            {hasChildren && (
                                                <button 
                                                    className={styles.collapseToggle}
                                                    onClick={(e) => handleToggleCollapse(e, node.id)}
                                                >
                                                    {isCollapsed ? `+ ${node.children.length}` : '-'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            } else {
                                // Lead & Member Cards Rendering
                                const avatarGrad = getInitialsGradient(node.employeeDisplayName);
                                return (
                                    <div 
                                        key={node.id}
                                        className={`${styles.cardWrapper} ${isNodeHighlighted ? styles.highlightedCard : ''}`}
                                        style={{
                                            left: node.x,
                                            top: node.y,
                                            width: CARD_WIDTH,
                                            height: CARD_HEIGHT
                                        }}
                                        onClick={() => handleCardClick(node)}
                                    >
                                        <div className={`${styles.empCard} ${styles.baseCard} ${node.type === 'lead' ? styles.leadCardBorder : ''}`}>
                                            {node.type === 'lead' && (
                                                <div className={styles.leadTag}>Project Lead</div>
                                            )}
                                            {node.type === 'member' && node.employeeRole && (
                                                <div className={styles.memberTag}>{node.employeeRole}</div>
                                            )}
                                            <div className={styles.empInfo}>
                                                <Avatar 
                                                    size={40}
                                                    style={{ background: avatarGrad, fontWeight: 'bold' }}
                                                >
                                                    {getAvatarInitials(node.employeeDisplayName)}
                                                </Avatar>
                                                <div className={styles.empBrief}>
                                                    <h4 className={styles.empName}>{node.employeeDisplayName}</h4>
                                                    <span className={styles.empDesignation}>
                                                        {node.designationName || node.subRoleName || node.roleName || 'Employee'}
                                                    </span>
                                                    {node.type === 'member' && node.projectAllocation !== undefined && (
                                                        <Tag color="cyan" className={styles.allocationTag}>
                                                            {node.projectAllocation}% Alloc
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Subtree Expand/Collapse Trigger */}
                                            {hasChildren && (
                                                <button 
                                                    className={styles.collapseToggle}
                                                    onClick={(e) => handleToggleCollapse(e, node.id)}
                                                >
                                                    {isCollapsed ? `+ ${node.children.length}` : '-'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}
            </div>

            {/* A. Dynamic Project Details Drawer */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ProjectOutlined style={{ fontSize: 22, marginRight: 8, color: '#1890ff' }} />
                        <span>Project Specifications</span>
                    </div>
                }
                placement="right"
                width={500}
                onClose={() => setSelectedProject(null)}
                open={!!selectedProject}
                className={styles.specDrawer}
            >
                {selectedProject && (
                    <div className={styles.drawerContent}>
                        <div className={styles.drawerHero}>
                            <h2 className={styles.projDrawerName}>{selectedProject.projectName}</h2>
                            <Tag color={getStatusTagColor(selectedProject.projectStatus)} style={{ marginTop: 6, fontSize: 13, padding: '2px 8px' }}>
                                {selectedProject.projectStatus}
                            </Tag>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><SolutionOutlined /> Client Information</h3>
                            <div className={styles.specGrid}>
                                <div className={styles.specLabel}>Client Name:</div>
                                <div className={styles.specValue}>{selectedProject.client || 'Unknown'}</div>
                            </div>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><CalendarOutlined /> Project Schedule</h3>
                            <div className={styles.specGrid}>
                                <div className={styles.specLabel}>Start Date:</div>
                                <div className={styles.specValue}>{selectedProject.startDate || 'N/A'}</div>
                                <div className={styles.specLabel}>End Date:</div>
                                <div className={styles.specValue}>{selectedProject.endDate || 'Ongoing'}</div>
                            </div>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><SolutionOutlined /> Project Overview</h3>
                            <p className={styles.projDescText}>
                                {selectedProject.description || 'No project description loaded in records.'}
                            </p>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><TeamOutlined /> Allocated Team ({selectedProject.members?.length || 0})</h3>
                            {selectedProject.lead && (
                                <div className={styles.leadDrawerRow}>
                                    <div className={styles.leadDrawerTitle}>Project Lead:</div>
                                    <div className={styles.leadDrawerInfo}>
                                        <Avatar 
                                            size="small" 
                                            style={{ background: getInitialsGradient(selectedProject.lead.employeeDisplayName), marginRight: 8 }}
                                        >
                                            {getAvatarInitials(selectedProject.lead.employeeDisplayName)}
                                        </Avatar>
                                        <span className={styles.leadDrawerName}>{selectedProject.lead.employeeDisplayName}</span>
                                    </div>
                                </div>
                            )}

                            <div className={styles.membersList}>
                                {selectedProject.members && selectedProject.members.length > 0 ? (
                                    selectedProject.members.map(member => (
                                        <div key={member.employeeId} className={styles.memberRow}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar 
                                                    size="small" 
                                                    style={{ background: getInitialsGradient(member.employeeDisplayName), marginRight: 8, fontSize: 10 }}
                                                >
                                                    {getAvatarInitials(member.employeeDisplayName)}
                                                </Avatar>
                                                <div className={styles.reportRowInfo}>
                                                    <span className={styles.reportRowName}>{member.employeeDisplayName}</span>
                                                    <span className={styles.reportRowDesig}>{member.employeeRole || 'Team Member'}</span>
                                                </div>
                                            </div>
                                            <Tag color="cyan" style={{ fontSize: 11 }}>{member.projectAllocation}% Alloc</Tag>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.noReports}>No active project staff allocated.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* B. Dynamic Employee Dossier Drawer */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <SolutionOutlined style={{ fontSize: 22, marginRight: 8, color: '#1890ff' }} />
                        <span>Professional Dossier</span>
                    </div>
                }
                placement="right"
                width={500}
                onClose={() => setSelectedEmployee(null)}
                open={!!selectedEmployee}
                className={styles.specDrawer}
            >
                {selectedEmployee && (
                    <div className={styles.drawerContent}>
                        <div className={styles.drawerHero}>
                            <Avatar
                                size={76}
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

                        <Divider style={{ margin: '20px 0 10px 0' }} />

                        {/* Profile Completion Dial */}
                        <div className={styles.completionSection}>
                            <div className={styles.completionLabel}>
                                <span>Profile Integrity Completion</span>
                                <strong>{selectedEmployee.profileCompletion?.completion_percentage || 0}%</strong>
                            </div>
                            <Progress 
                                percent={selectedEmployee.profileCompletion?.completion_percentage || 0} 
                                showInfo={false} 
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                status="active"
                            />
                            {selectedEmployee.profileCompletion?.missing_fields?.length > 0 && (
                                <div className={styles.missingFieldsBox}>
                                    <span className={styles.missingLabel}>Pending Verification Items:</span>
                                    <div className={styles.missingTags}>
                                        {selectedEmployee.profileCompletion.missing_fields.map(field => (
                                            <Tag key={field} color="red" style={{ margin: '2px 4px 2px 0', fontSize: 11 }}>
                                                {field}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><UserOutlined /> Placement & Role Specifications</h3>
                            <div className={styles.specGrid}>
                                <div className={styles.specLabel}>Employee ID:</div>
                                <div className={styles.specValue}>{selectedEmployee.employeeId}</div>
                                <div className={styles.specLabel}>System Role:</div>
                                <div className={styles.specValue}>{selectedEmployee.roleName || 'Employee'}</div>
                                <div className={styles.specLabel}>Sub Role:</div>
                                <div className={styles.specValue}>{selectedEmployee.subRoleName || 'N/A'}</div>
                                <div className={styles.specLabel}>Designation:</div>
                                <div className={styles.specValue}>{selectedEmployee.designationName || 'N/A'}</div>
                            </div>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className={styles.specSection}>
                            <h3 className={styles.sectionHeader}><SolutionOutlined /> Communications Directory</h3>
                            <div className={styles.specGrid}>
                                <div className={styles.specLabel}>Primary Email:</div>
                                <div className={styles.specValue}>
                                    <a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}

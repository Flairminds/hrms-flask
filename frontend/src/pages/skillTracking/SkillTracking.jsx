import React, { useEffect, useState } from "react";
import styleSkillTracking from "./SkillTracking.module.css";
import { getSkillsForAllEmp } from "../../services/api";

export const SkillTracking = () => {
    const [skillData, setSkillData] = useState(null);
    const [maxSecondarySkills, setMaxSecondarySkills] = useState(0);
    const[maxCrossTechSkill,setMaxCrossTechSkill]=useState(0)
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const handleSkillForAll = async () => {
            const response = await getSkillsForAllEmp();
            setSkillData(response.data);

            // Determine the max number of secondary skills for dynamic columns
            const maxSkills = response.data.reduce((max, employee) => {
                return Math.max(max, employee.Skills?.Secondary?.length || 0);
            }, 0);
            
            
            setMaxSecondarySkills(maxSkills);

            const crossTechSkill = response.data.reduce((max, employee) => {
                return Math.max(max, employee.Skills?.CrossTechSkill?.length || 0);
            }, 0);
            console.log(crossTechSkill,"amz");
            setMaxCrossTechSkill(crossTechSkill)
        };
        handleSkillForAll();
    }, []);

    // Process and structure employee data
    const groupedData = skillData?.map((employee) => {
        const primarySkills = employee.Skills?.Primary || [];
        const secondarySkills = employee.Skills?.Secondary || [];
        const crossTechSkills = employee.Skills?.CrossTechSkill || [];

        return {
            EmployeeId: employee.EmployeeId,
            Name: `${employee.FirstName} ${employee.LastName}`,
            DateOfJoining: new Date(employee.DateOfJoining).toLocaleDateString(),
            SubRole: employee.SubRole,
            TeamLeadId: employee.TeamLeadId,
            LobLead: employee.LobLead ?? "N/A",
            IsLead: employee.IsLead ? "Yes" : "No",
            FullStackReady: employee.FullStackReady ? "Yes" : "No", 
            PrimarySkills: primarySkills.map((skill) => skill.SkillName).join(", ") || "N/A",
            SecondarySkills: secondarySkills.map((skill) => ({
                name: skill.SkillName,
                isReady: skill.isReady ? "Yes" : "No",
                readyDate: skill.isReadyDate ? new Date(skill.isReadyDate).toLocaleDateString() : "N/A",
            })),
            CrossTechSkill: crossTechSkills.map((skill) => ({
                name: skill.SkillName,
                isReady: skill.isReady ? "Yes" : "No",
                readyDate: skill.isReadyDate ? new Date(skill.isReadyDate).toLocaleDateString() : "N/A",
            })),

        };
    }) || [];

    const filteredData = groupedData.filter((employee) =>
        employee.Name.toLowerCase().includes(searchQuery.toLowerCase())
    
    );
    // console.log("FullStackReady value:", filteredData);

    return (
        <div className={styleSkillTracking.main}>
            <h2>Skill & Availability</h2>

            {/* Search Bar */}
            <input
                type="text"
                placeholder="Search by Employee Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styleSkillTracking.searchInput}
            />

            {filteredData.length > 0 ? (
                <div className={styleSkillTracking.tableContainer}>
                    <table className={styleSkillTracking.table}>
                        <thead className={styleSkillTracking.stickyHeader}>
                            <tr className={styleSkillTracking.headRow}>
                                <th className={styleSkillTracking.th}>Employee Id</th>
                                <th className={styleSkillTracking.th}>Name of Employee</th>
                                <th className={styleSkillTracking.th}>Date of Joining</th>
                                <th className={styleSkillTracking.th}>Primary Skills</th>
                                <th className={styleSkillTracking.th}>Sub Role</th>
                                <th className={styleSkillTracking.th}>Team Lead Id</th>
                                <th className={styleSkillTracking.th}>LOB Lead</th>
                                <th className={styleSkillTracking.th}>Is Lead</th>
                                <th className={styleSkillTracking.th}>Full Stack Ready </th>
                                

                                {/* Dynamically add secondary skill columns */}
                                {[...Array(maxSecondarySkills)].map((_, index) => (
                                    <React.Fragment key={`sec-header-${index}`}>
                                        <th className={styleSkillTracking.th}>Secondary Skill {index + 1}</th>
                                        <th className={styleSkillTracking.th}>Is Ready {index + 1}</th>
                                        <th className={styleSkillTracking.th}>Ready Date {index + 1}</th>
                                    </React.Fragment>
                                ))}

                                {[...Array(maxCrossTechSkill)].map((_, index) => (
                                    <React.Fragment key={`sec-header-${index}`}>
                                        <th className={styleSkillTracking.th}>Cross Tech Skill {index + 1}</th>
                                        <th className={styleSkillTracking.th}>Is Ready {index + 1}</th>
                                        <th className={styleSkillTracking.th}>Ready Date {index + 1}</th>
                                    </React.Fragment>
                                ))}


                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((employee, index) => (
                                <tr key={index} className={styleSkillTracking.tr}>
                                    <td className={styleSkillTracking.td}>{employee.EmployeeId}</td>
                                    <td className={styleSkillTracking.td}>{employee.Name}</td>
                                    <td className={styleSkillTracking.td}>{employee.DateOfJoining}</td>
                                    <td className={styleSkillTracking.td}>{employee.PrimarySkills}</td>
                                    <td className={styleSkillTracking.td}>{employee.SubRole}</td>
                                    <td className={styleSkillTracking.td}>{employee.TeamLeadId}</td>
                                    <td className={styleSkillTracking.td}>{employee.LobLead}</td>
                                    <td className={styleSkillTracking.td}>{employee.IsLead}</td>
                                    <td className={styleSkillTracking.td}>
                                        {employee.FullStackReady }
                                    </td>


                                    {/* Dynamically add secondary skill data */}
                                    {[...Array(maxSecondarySkills)].map((_, secIndex) => {
                                        const skill = employee.SecondarySkills[secIndex];
                                        return (
                                            <React.Fragment key={`sec-data-${index}-${secIndex}`}>
                                                <td className={styleSkillTracking.td}>{skill ? skill.name : "N/A"}</td>
                                                <td className={styleSkillTracking.td}>{skill ? skill.isReady : "N/A"}</td>
                                                <td className={styleSkillTracking.td}>{skill ? skill.readyDate : "N/A"}</td>
                                            </React.Fragment>
                                        );
                                    })}

                                    {[...Array(maxCrossTechSkill)].map((_, secIndex) => {
                                        const skill = employee.CrossTechSkill[secIndex];
                                        return (
                                            <React.Fragment key={`sec-data-${index}-${secIndex}`}>
                                                <td className={styleSkillTracking.td}>{skill ? skill.name : "N/A"}</td>
                                                <td className={styleSkillTracking.td}>{skill ? skill.isReady : "N/A"}</td>
                                                <td className={styleSkillTracking.td}>{skill ? skill.readyDate : "N/A"}</td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No results found</p>
            )}
        </div>
    );
};

import { Modal } from 'antd'
import React, { useEffect, useState } from 'react'
import styles from "./EMPDetailsModal.module.css"
import { getCompanyBands, getCompanyRoles, getSkillsForEmp } from '../../../services/api';
import { getCookie } from '../../../util/CookieSet';

export const EMPDetailsModal = ({ detailsModal, setDetailsModal, personalEmployeeDetails }) => {
  const [bandsData, setBandsData] = useState([]);
  const [roleData, setRoleData] = useState([])
  const [highestQualificationYearMonth, setHighestQualificationYearMonth] = useState(null)
  const [fullStackReady, setFullStackReady] = useState(false)

  const getRoleData = async () => {
    const response = await getCompanyRoles()
    setRoleData(response.data)

  }

  const getCompanyBandsData = async () => {
    try {
      const response = await getCompanyBands();
      if (Array.isArray(response.data)) {
        setBandsData(response.data); // Save the bands data
      } else {
        console.error('Expected an array from getCompanyBands');
      }
    } catch (error) {
      console.error('Error fetching company bands:', error);
    }
  };
  useEffect(() => {
    getCompanyBandsData();
    getRoleData()
  }, []);
  const handleCancel = () => {
    setDetailsModal(false)
  }

  const getBandName = (bandNumber) => {


    if (Array.isArray(bandsData)) {



      const band = bandsData.find(b => b.DesignationId === bandNumber);


      return band?.Band;
    }
    return 'N/A';
  };

  const getRoleName = (roleNumber) => {

    if (Array.isArray(roleData)) {


      const role = roleData.find(b => b.SubRoleId === roleNumber);


      return role?.Role;
    }
    return 'N/A';
    // };

  }
  const employeeIdCookie = getCookie('employeeId');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await getSkillsForEmp(employeeIdCookie);
        setHighestQualificationYearMonth(response.data.QualificationYearMonth)
        setFullStackReady(response.data.FullStackReady)
      } catch (error) {
        console.error("Error fetching skills:", error);
      }
    };

    fetchSkills();


  }, [])
  return (
    // <div>
    <Modal open={detailsModal} footer={null} width={600} onCancel={handleCancel} centered
      title={
        <div className={styles.titleDiv} style={{ borderBottom: "none" }}>
          <span className={styles.headingContainer1}>Employee Details</span>
        </div>
      }
    >
      <div className={styles.employeeDetailsContainer}>



        <div className={styles.personalInfoContainer}>



          {personalEmployeeDetails ? (

            <div className={styles.infoFields}>

              <div className={styles.infoItem}><strong>Employee ID:</strong> {personalEmployeeDetails.employeeId}</div>

              <div className={styles.infoItem}><strong>First Name:</strong> {personalEmployeeDetails.firstName}</div>

              <div className={styles.infoItem}><strong>Middle Name:</strong> {personalEmployeeDetails.middleName || 'N/A'}</div>

              <div className={styles.infoItem}><strong>Last Name:</strong> {personalEmployeeDetails.lastName}</div>
              <div className={styles.infoItem}>
                <strong>Date of Birth:</strong>
                {new Date(personalEmployeeDetails.dateOfBirth).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>

              <div className={styles.infoItem}><strong>Contact Number:</strong> {personalEmployeeDetails.contactNumber}</div>

              <div className={styles.infoItem} ><strong>Emergency Contact Person:</strong> {personalEmployeeDetails.emergencyContactPerson}</div>

              <div className={styles.infoItem} ><strong>Emergency Contact Relation:</strong> {personalEmployeeDetails.emergencyContactRelation}</div>

              <div className={styles.infoItem} ><strong>Emergency Contact Number:</strong> {personalEmployeeDetails.emergencyContactNumber}</div>

              <div className={styles.infoItem} ><strong>Email:</strong> {personalEmployeeDetails.email}</div>

              <div className={styles.infoItem}><strong>Personal Email:</strong> {personalEmployeeDetails.personalEmail || 'N/A'}</div>

              <div className={styles.infoItem} ><strong>Gender:</strong> {personalEmployeeDetails.gender}</div>

              <div className={styles.infoItem}><strong>Blood Group:</strong> {personalEmployeeDetails.bloodGroup || 'N/A'}</div>

              <div className={styles.infoItem}><strong>Band:</strong> {getBandName(personalEmployeeDetails.band)}</div>

              <div className={styles.infoItem} ><strong>Role:</strong> {getRoleName(personalEmployeeDetails.MasterSubRole)}</div>

              <div className={styles.infoItem}>
                <strong>Date of Joining:</strong>
                {new Date(personalEmployeeDetails.dateOfJoining).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>

              <div className={styles.infoItem} ><strong>Highest Qualification:</strong> {personalEmployeeDetails.highestQualification}</div>

              <div className={styles.infoItem}><strong>Highest Qualification Year-Month:</strong> {highestQualificationYearMonth}</div>

              <div className={styles.infoItem}>
                <strong>Full Stack Ready:</strong> {fullStackReady ? "Yes" : "No"}
              </div>
              {/* Residential Address Section */}

              <div className={styles.addressSection}>

                <h6 className={styles.headingContainer}>Residential Address</h6>

                <div className={styles.infoItem}><strong>Type:</strong> {personalEmployeeDetails.addresses.residentialAddressType}</div>

                <div className={styles.infoItem}><strong>Address Line 1:</strong> {personalEmployeeDetails.addresses.residentialAddress1}</div>

                <div className={styles.infoItem}><strong>Address Line 2:</strong> {personalEmployeeDetails.addresses.residentialAddress2}</div>

                <div className={styles.infoItem}><strong>City:</strong> {personalEmployeeDetails.addresses.residentialCity}</div>

                <div className={styles.infoItem}><strong>State:</strong> {personalEmployeeDetails.addresses.residentialState}</div>

                <div className={styles.infoItem}><strong>Zipcode:</strong> {personalEmployeeDetails.addresses.residentialZipcode || 'N/A'}</div>

              </div>



              {/* Permanent Address Section */}

              <div className={styles.addressSection}>

                <h6 className={styles.headingContainer}>Permanent Address</h6>

                <div className={styles.infoItem}><strong>Type:</strong> {personalEmployeeDetails.addresses.permanentAddressType}</div>

                <div className={styles.infoItem}><strong>Address Line 1:</strong> {personalEmployeeDetails.addresses.permanentAddress1}</div>

                <div className={styles.infoItem}><strong>Address Line 2:</strong> {personalEmployeeDetails.addresses.permanentAddress2}</div>

                <div className={styles.infoItem}><strong>City:</strong> {personalEmployeeDetails.addresses.permanentCity}</div>

                <div className={styles.infoItem}><strong>State:</strong> {personalEmployeeDetails.addresses.permanentState}</div>

                <div className={styles.infoItem}><strong>Zipcode:</strong> {personalEmployeeDetails.addresses.permanentZipcode || 'N/A'}</div>

              </div>



              {/* Skills Section */}

              <div className={styles.addressSection}>

                <h6 className={styles.headingContainer}>Skills</h6>

                {personalEmployeeDetails.skills?.map((skill, index) => (

                  <div className={styles.infoItem} key={index}>

                    <strong> {skill.skillLevel}:</strong> {skill.skillName}

                  </div>

                ))}

              </div>

            </div>

          ) : (

            <div>Loading...</div>

          )}

        </div>

      </div>
    </Modal>
    // </div>
  )
}
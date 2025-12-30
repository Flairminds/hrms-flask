import React, { useState } from 'react';
import styles from './EmployeeDataModal.module.css';
 
const EmployeeData = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [formData, setFormData] = useState({});
 
  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };
 
  const handleInputChange = (e, fieldName) => {
    setFormData({
      ...formData,
      [fieldName]: e.target.value
    });
  };
 
  const handleSubmit = (e) => {
    e.preventDefault();
  
  };
 
  const accordionData = [
    {
      title: 'Section 1',
      fields: [
        { label: 'First Name:', type: 'text', name: 'firstName' },
        { label: 'Middle Name:', type: 'text', name: 'middleName' },
        { label: 'Last Name:', type: 'text', name: 'lastName' },
        { label: 'Location:', type: 'text', name: 'location' },
        { label: 'Date of Joining:', type: 'text', name: 'dateOfJoining' },
        { label: 'Gender:', type: 'text', name: 'gender' },
        { label: 'Educational Qualification:', type: 'text', name: 'qualification' },
        { label: 'Date of Birth:', type: 'text', name: 'dateOfBirth' },
        { label: 'Band:', type: 'text', name: 'band' },
        { label: 'Role:', type: 'text', name: 'role' },
        { label: 'Personal email id:', type: 'email', name: 'personalEmail' }
      ]
    },
    {
      title: 'Section 2',
      fields: [
        { label: 'Age:', type: 'number', name: 'age' },
        { label: 'Address:', type: 'text', name: 'address' }
      ]
    },
    {
      title: 'Section 3',
      fields: [
        { label: 'Phone:', type: 'tel', name: 'phone' },
        { label: 'Subject:', type: 'text', name: 'subject' }
      ]
    }
  ];
 
  return (
    <div className={styles.accordion}>
      {accordionData.map((item, index) => (
        <div className={styles.accordionItem} key={index}>
          <div className={styles.accordionTitle} onClick={() => toggleAccordion(index)}>
            {item.title}
          </div>
          {activeIndex === index && (
            <div className={styles.accordionContent}>
              <form onSubmit={handleSubmit}>
                {item.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex}>
                    <label>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        onChange={(e) => handleInputChange(e, field.name)}
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        onChange={(e) => handleInputChange(e, field.name)}
                      />
                    )}
                  </div>
                ))}
                <button type="submit">Submit</button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
 
export default EmployeeData;
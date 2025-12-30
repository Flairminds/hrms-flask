import React, { useState } from 'react';
import styleGoal from "./GoalSettingForm.module.css";
import { LeadAssign } from '../../components/leadAssign/LeadAssign';
import { LeadForm } from '../../components/leadForm/LeadForm';

export const GoalSettingForm = () => {
  const [isLeadAssignActive, setIsLeadAssignActive] = useState(true);

  return (
    <div className={styleGoal.main}>
      <div className={styleGoal.buttonContainer}>
        <button
          className={`${styleGoal.button} ${isLeadAssignActive ? styleGoal.active : styleGoal.inactive}`}
          onClick={() => setIsLeadAssignActive(true)}
        >
          Lead Assign
        </button>
        <button
          className={`${styleGoal.button} ${!isLeadAssignActive ? styleGoal.active : styleGoal.inactive}`}
          onClick={() => setIsLeadAssignActive(false)}
        >
          Lead Form
        </button>
      </div>

      <div>
        {isLeadAssignActive && <LeadAssign />}
        {!isLeadAssignActive && <LeadForm />}
      </div>
    </div>
  );
};

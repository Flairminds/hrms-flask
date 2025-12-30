import React, { useState } from 'react';
import styleGoal from "./SkillsAssessment.module.css";
import { AssignEvaluator } from '../../components/AssignEvaluator/AssignEvaluator';
import { ViewEvaluators } from '../ViewEvaluators/ViewEvaluators';

export const SkillsAssessment = () =>{
    const [isEvaluatorAssigned, setEvaluatorAssigned] = useState(true);
    
    return(
          <div className={styleGoal.main}>
              <div className={styleGoal.buttonContainer}>
                <button
                  className={`${styleGoal.button} ${isEvaluatorAssigned ? styleGoal.active : styleGoal.inactive}`}
                  onClick={() => setEvaluatorAssigned(true)}
                >
                  Set Skill Evaluator
                </button>
                <button
                  className={`${styleGoal.button} ${!isEvaluatorAssigned ? styleGoal.active : styleGoal.inactive}`}
                  onClick={() => setEvaluatorAssigned(false)}
                >
                 View Evaluators
                </button>
              </div>
        
              <div>
                {isEvaluatorAssigned && < AssignEvaluator/>}
                {!isEvaluatorAssigned && < ViewEvaluators/>}
              </div>
            </div>
    )
}

export default SkillsAssessment;


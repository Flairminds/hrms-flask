import React, { useState, useEffect } from "react";
import { Form, Input, InputNumber, Button, Checkbox, message } from 'antd';
import styles from "./SkillEvaluationReviewForm.module.css";
import Cookies from 'js-cookie';

export const SkillEvaluationReviewForm = ({ skill, review, onSubmit, onCancel, expanded, setExpandedRow }) => {
    const [form] = Form.useForm();
    const [score, setScore] = useState(review.evaluatorScore || skill.SelfEvaluation || 1);
  
    useEffect(() => {
      // Set initial values from review data, ensuring evaluatorScore is used
      form.setFieldsValue({
        comments: review.comments || "",
        evaluatorScore: review.evaluatorScore !== null && review.evaluatorScore !== undefined ? review.evaluatorScore : (skill.SelfEvaluation || 1),
        isReady: review.isReady || false
      });
      setScore(review.evaluatorScore !== null && review.evaluatorScore !== undefined ? review.evaluatorScore : (skill.SelfEvaluation || 1));
    }, [review, skill, form]);
  
    const getScoreFeedback = (score) => {
      if (score === null || score === undefined) return { text: "No score provided", color: "#888" };
      if (score >= 0 && score <= 1) return { text: "Does not meet requirements", color: "#ff4d4f" };
      if (score > 1 && score <= 2) return { text: "Occasionally meets requirements", color: "#fa8c16" };
      if (score > 2 && score <= 3) return { text: "Meets requirements / Average", color: "#52c41a" };
      if (score > 3 && score < 5) return { text: "Above average", color: "#52c41a" };
      if (score === 5) return { text: "Exceeds expectations", color: "#52c41a" };
      return { text: "", color: "#000000" };
    };
  
    const handleFinish = (values) => {
      const isReviewed = review.status === 'Reviewed' && review.reviewedById !== Cookies.get('employeeId');
      if (isReviewed) {
        message.error(`This skill was already reviewed by ${review.reviewedBy}.`);
        return;
      }
      onSubmit(skill.SkillId, { ...values, evaluatorScore: score });
    };
  
    const handleScoreChange = (value) => {
      setScore(value);
      form.setFieldsValue({ evaluatorScore: value }); // Sync form with state
    };
  
    const isReviewed = review.status === 'Reviewed' && review.reviewedById !== Cookies.get('employeeId');
  
    return (
      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        style={{ padding: '16px', backgroundColor: isReviewed ? '#f5f5f5' : '#fafafa', borderRadius: '4px', margin: '8px 0', opacity: isReviewed ? 0.6 : 1 }}
      >
        {isReviewed && (
          <div style={{ color: '#ff4d4f', fontStyle: 'italic', marginBottom: '10px' }}>
            This skill was already reviewed by {review.reviewedBy} 🔒
          </div>
        )}
        <Form.Item name="comments" label="Comments" rules={[{ max: 500 }]}>
          <Input.TextArea
            placeholder="Enter your comments here..."
            rows={3}
            maxLength={500}
            showCount
            disabled={isReviewed}
          />
        </Form.Item>
        <Form.Item name="evaluatorScore" label="Evaluator Score">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <InputNumber
              min={0}
              max={5}
              step={0.1}
              style={{ width: '100px' }}
              precision={1}
              value={score}
              onChange={handleScoreChange}
              disabled={isReviewed}
            />
            <span style={{ color: getScoreFeedback(score).color, fontWeight: 'bold', minWidth: '200px' }}>
              {getScoreFeedback(score).text}
            </span>
          </div>
        </Form.Item>
        <Form.Item name="isReady" valuePropName="checked" label="Is ready for customer-facing Level 1 assignment?">
          <Checkbox disabled={isReviewed} />
        </Form.Item>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="primary" htmlType="submit" disabled={isReviewed}>
            Save Review
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </Form>
    );
  };
  
  export default SkillEvaluationReviewForm;
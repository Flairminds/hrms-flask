const LEAVE_CONDITIONS = {
    "Privilege Leave": [
        "Privileged leave applications must be submitted at least 7 days in advance.",
        "Leave balance cannot be exceeded."
    ],
    "Missed Door Entry": [
        "Only Full Day leave is allowed for Missed Door Entry.",
        "Can only be applied for past or current dates (not future dates).",
        "Time log will be verified by approver before approval."
    ],
    "Customer Approved Comp-off": [
        "When applying full day comp off the logged time in zymmr for the day of compoff must be minimum of 8hrs",
        "When applying half day comp off the logged time in zymmr for the day of compoff must be minimum of 4hrs",
        "There must be approval from customer before applying compoff"
    ],
    "Customer Holiday": [
        "Worked date must be before the leave date.",
        "Time log will be verified by approver before approval."
    ],
    "Work From Home": [
        "Cannot apply for Monday.",
        "Maximum 5 consecutive days allowed.",
        "For current date: Full Day must be applied before 9:30 AM, Half Day before 11:59 AM.",
        "More than 1 day WFH in a week requires 1 week advance notice and 2nd level approval.",
        "Cannot apply within first 12 months of joining.",
        "Cannot apply for 5 days if already taken a 5-day WFH in the last 6 months."
    ]
}

export default LEAVE_CONDITIONS
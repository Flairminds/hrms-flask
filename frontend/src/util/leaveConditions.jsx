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
    ]
}

export default LEAVE_CONDITIONS
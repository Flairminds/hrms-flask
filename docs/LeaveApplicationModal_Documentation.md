# LeaveApplicationModal Component Documentation

## Overview
The `LeaveApplicationModal` is a comprehensive React component for managing leave applications in the HRMS system. It handles multiple leave types with specific validation rules, date restrictions, and business logic.

## Component Location
`frontend/src/components/modal/leaveApplicationModal/LeaveApplicationModal.jsx`

---

## State Management

### Core Leave Application State
- `startDate`: Leave start date (dayjs object)
- `endDate`: Leave end date (dayjs object)
- `leaveDuration`: Duration type ("Full Day" or "Half Day")
- `leaveType`: Selected leave type (string)
- `leaveDays`: Calculated number of leave days (number)
- `comments`: Leave description/comments (string)
- `handOverComments`: Work handover instructions (string)

### Specialized Leave State
- `workedDate`: For Customer Holiday - date employee worked (dayjs object)
- `workingLateReason`: Reason for staying late (string)
- `fromTime`: Working Late start time (dayjs time)
- `toTime`: Working Late end time (dayjs time)
- `compOffTransactions`: Array of comp-off working hours `{compOffDate, numberOfHours}`

### UI & Validation State
- `leaveOptions`: `{leaveTypes: Array, approver: string}` - Available leave types and approver
- `error`: Error message (string)
- `showAlert`: Show leave balance exhausted alert (boolean)
- `alertLeaveType`: Leave type triggering alert (string)
- `alertMissedDoorCount`: Show remaining missed door entries (boolean)
- `isValidDescription`: Description validation for Missed Door Entry (boolean)
- `loader`: Submit button loading state (boolean)
- `totalHours`: Total comp-off hours (number)

### External Props
- `isSetLeaveApplicationModal`: Modal visibility (boolean)
- `preSelectedLeaveType`: Pre-selected leave type from category cards (string)
- `leaveDates`: Object mapping dates to applied leaves
- `apiHolidays`: Array of holiday data
- `leaveCardData`: Leave balance information
- `employeeData`: Employee leave history
- `formattedLeaveData`: Formatted leave card data with percentages

---

## Leave Type IDs Mapping

| Leave Type | ID |
|-----------|-----|
| Sick/Emergency Leave | 1 |
| Privilege Leave | 2 |
| Work From Home | 3 |
| Customer Approved Comp-off | 4 |
| Customer Approved Work From Home | 5 |
| Customer Holiday | 6 |
| Working Late Today | 7 |
| Visiting Client Location | 8 |
| Missed Door Entry | 14 |

---

## Business Logic & Validation Rules

### 1. Work From Home (WFH) - ID: 3
**Restrictions:**
- ❌ Cannot apply for Monday
- ❌ Maximum 5 consecutive days
- ⏰ **Full Day**: Cannot apply for today after 9:30 AM
- ⏰ **Half Day**: Cannot apply for today after 11:59 AM
- 📊 Balance check: Shows alert if WFH balance exhausted

**Validation:**
```javascript
// Monday restriction
if (startDate.format('dddd') === "Monday") → Error

// Max 5 days
if (leaveDays > 5) → Error

// Time-based restriction for today
if (currentTime.isAfter(cutoffTime)) → Disable today
```

### 2. Privilege Leave - ID: 2
**Restrictions:**
- 📅 Must be applied at least **7 days in advance**
- 📊 Balance check: Shows alert if balance exhausted

**Validation:**
```javascript
const diffDays = (selectedDate - today) / (1000 * 60 * 60 * 24)
if (diffDays < 7) → Date disabled
```

### 3. Customer Approved Comp-off - ID: 4
**Requirements:**
- ✅ Must provide comp-off working date(s) with hours via `CompOff` component
- ✅ Full Day: Minimum 8 hours logged in Zymmr
- ✅ Half Day: Minimum 4 hours logged in Zymmr
- ✅ Customer approval required before applying
- ⏰ Can only apply within **3 months** of comp-off date

**Validation:**
```javascript
// Date range: compOffDate to compOffDate + 3 months
const isAfterThreeMonths = current.isAfter(compOffDate + 3 months)
const isBeforeCompOffDate = current.isBefore(compOffDate)
if (isAfterThreeMonths || isBeforeCompOffDate) → Date disabled

// Form validation
compOffTransactions.length > 0 && 
compOffTransactions.every(t => t.compOffDate && t.numberOfHours > 0)
```

### 4. Customer Holiday - ID: 6
**Requirements:**
- ✅ Must specify the **worked date** (date employee worked on holiday)
- 🔒 Worked date must be **before** the leave start date

**Validation:**
```javascript
if (workedDate.isAfter(startDate)) → Error
```

### 5. Working Late Today - ID: 7
**Requirements:**
- 📅 Automatically sets start/end date to **today**
- ⏰ Must provide **from time** and **to time**
- 📝 Must provide **reason for working late**
- 🔒 Dates are locked (disabled in UI)

**Required Fields:**
- `fromTime` (HH:mm format)
- `toTime` (HH:mm format)
- `workingLateReason` (string)

### 6. Missed Door Entry - ID: 14
**Requirements:**
- 📅 Automatically sets to **Full Day** (locked)
- 📝 Description must be **at least 5 characters**
- 📊 Shows remaining missed door entries for the quarter
- ⚠️ Maximum **3 missed door entries per quarter**

**Validation:**
```javascript
// Description validation
if (comments.length >= 5) → Valid
else → Invalid (form disabled)

// Remaining count
Remaining = 3 - formattedLeaveData[3]?.totalUsedLeaves
```

### 7. Sick/Emergency Leave - ID: 1
**Restrictions:**
- 📊 Balance check: Shows alert if balance exhausted
- ⚠️ If balance = 0, leave becomes **unpaid**

---

## Date Calculation Logic

### `calculateLeaveDays(startDate, endDate)`
Calculates working days between start and end dates, excluding:
- **Weekends** (Saturday & Sunday)
- **Public holidays** (from `apiHolidays`)

```javascript
Algorithm:
1. Initialize count = 0
2. For each date from startDate to endDate:
   - Get day of week (0 = Sunday, 6 = Saturday)
   - Convert current date to string
   - If NOT (weekend OR holiday):
     - count++
3. Return count
```

### Holiday Date Format Conversion
```javascript
// API provides: "DD-MM-YYYY"
// Calendar uses: "YYYY-MM-DD"

const [day, month, year] = holidayDate.split('-')
const formattedDate = new Date(`${year}-${month}-${day}`)
```

---

## Calendar Cell Rendering

The calendar uses custom cell rendering to show:
- 🔴 **Red dot**: Public holiday (with tooltip showing holiday name)
- 🟢 **Green ellipse**: Already applied leave (with tooltip showing leave type)

```javascript
cellRender(current, info):
  - Check if current date matches holiday
  - Check if current date has applied leave (from leaveDates)
  - Render appropriate indicator with tooltip
```

---

## Form Validation (`isFormValid()`)

### Standard Leave Types
```javascript
Required:
- leaveType
- leaveDuration
- startDate
- endDate
- leaveDays > 0
- comments
- handOverComments
```

### Customer Approved Comp-off
```javascript
Additional Requirements:
- compOffTransactions.length > 0
- Every transaction has compOffDate && numberOfHours > 0
```

### Customer Holiday
```javascript
Additional Requirement:
- workedDate (must be provided)
```

### Working Late Today
```javascript
Required:
- fromTime
- toTime
- workingLateReason
- handOverComments
- comments
```

### Missed Door Entry
```javascript
Required:
- isValidDescription (comments.length >= 5)
```

---

## API Integrations

### 1. `getTypeApprover(employeeId)`
**Purpose**: Fetches available leave types and approver for the employee

**Response:**
```javascript
{
  leaveTypes: ["Sick/Emergency Leave", "Privilege Leave", ...],
  approver: "Manager Name"
}
```

**Usage**: Populates leave type dropdown and displays approver

### 2. `getLeaveCardDetails(employeeId)`
**Purpose**: Fetches leave balance information

**Response:**
```javascript
[
  {
    leaveName: "Sick/Emergency Leave",
    totalAllotedLeaves: 6,
    totalUsedLeaves: 2
  },
  ...
]
```

**Usage**: 
- Calculate remaining balance
- Show "leave exhausted" alerts
- Display remaining missed door entries

### 3. `getLeaveDetails(employeeId, year)`
**Purpose**: Fetches employee's leave history for a specific year

**Response:**
```javascript
{
  data: [
    {
      leaveTranId: 123,
      fromDate: "2025-01-01",
      toDate: "2025-01-02",
      leaveName: "Sick/Emergency Leave",
      leaveStatus: "Approved",
      ...
    }
  ]
}
```

**Usage**: Updates parent component's `employeeData` to refresh leave table

### 4. `holidayListData()`
**Purpose**: Fetches public holidays list

**Response:**
```javascript
[
  {
    holidayDate: "01-01-2025",
    holidayName: "New Year"
  },
  ...
]
```

**Usage**:
- Exclude holidays from leave day calculation
- Display red dots on calendar
- Show holiday names in tooltips

### 5. `insertLeaveTransaction(payload)`
**Purpose**: Submits leave application

**Payload Structure:**
```javascript
{
  employeeId: string,
  comments: string,
  leaveType: number (leave type ID),
  duration: "Full Day" | "Half Day",
  fromDate: "YYYY-MM-DD",
  toDate: "YYYY-MM-DD",
  handOverComments: string,
  noOfDays: number,
  approvedBy: string,
  appliedBy: string,
  
  // Conditional fields based on leave type
  compOffTransactions: [{compOffDate, numberOfHours}],  // For ID 4
  cutsomerHolidays: {workedDate},                       // For ID 6
  workingLates: {fromtime, totime, reasonforworkinglate} // For ID 7
}
```

---

## Key User Workflows

### Standard Leave Application
1. User selects leave type → `handleLeaveTypeChange()`
2. System checks balance → Shows alert if exhausted
3. User selects duration (Full Day/Half Day) → `handleDurationChange()`
4. User selects start date → `handleStartDateChange()` → Calculates leave days
5. User selects end date (if Full Day) → `handleEndDateChange()` → Recalculates
6. User enters comments and handover notes
7. Form validates → Submit button enables if valid
8. User clicks Apply → `handleOk()` → API call → Modal closes

### Comp-off Application
1. User selects "Customer Approved Comp-off"
2. `CompOff` component renders
3. User adds comp-off dates and hours → `handleFormSubmit()`
4. System calculates `totalHours` and stores `compOffTransactions`
5. Start/End date pickers enable (restricted to 3-month window from comp-off dates)
6. Standard flow continues...

### Working Late Application
1. User selects "Working Late Today"
2. Start/End dates auto-set to today (locked)
3. Time pickers and reason field appear
4. User fills: From Time, To Time, Reason
5. User enters comments and handover notes
6. Submit

### Missed Door Entry
1. User selects "Missed Door Entry"
2. Duration locks to "Full Day"
3. Shows remaining missed door entries alert
4. User selects date
5. End date auto-matches start date (locked)
6. User enters description (min 5 characters)
7. Description validates in real-time → Enables submit

---

## State Cleanup

### `handleCancel()`
Resets all state to initial values when modal is closed:
- Clears all date fields
- Resets leave type and duration
- Clears comments and handover comments
- Resets comp-off transactions
- Hides alerts
- Closes modal

### Post-Submission Cleanup
After successful submission (`handleOk()`):
- Refreshes leave card data via `leaveCardDetails()`
- Refreshes leave table via `fetchEmployeeData()`
- Resets all form state
- Shows success/error toast message
- Closes modal

---

## Edge Cases & Error Handling

### 1. Leave Balance Exhausted
- Shows warning alert for Sick/Emergency and Privilege Leave
- For WFH: Prevents application entirely
- For Sick/Emergency: Warns it will be unpaid leave

### 2. Late Applications
- WFH Full Day after 9:30 AM → Disables today
- WFH Half Day after 11:59 AM → Disables today
- Privilege Leave less than 7 days in advance → Date disabled

### 3. Comp-off Expiry
- Comp-off must be used within 3 months
- Dates outside this window are disabled
- Cannot select dates before comp-off working date

### 4. Holiday Working Validation
- Customer Holiday: worked date must be before leave date
- Error toast shown if validation fails

### 5. Network Errors
- Try-catch in `handleOk()`
- Shows error toast with `error.response.data`
- Refreshes data even on error
- Always closes modal in `finally` block

---

## Dependencies

- **React**: Component framework
- **Ant Design**: UI components (Modal, DatePicker, Select, Input, Button, TimePicker, Tooltip)
- **dayjs**: Date manipulation and formatting
- **react-toastify**: Toast notifications
- **AuthContext**: Employee ID from authentication context
- **CompOff**: Child component for comp-off date/hour entry

---

## CSS Modules
Component uses `LeaveApplicationModal.module.css` for styling with class names:
- `.titleDiv`, `.titleHeading`
- `.btnDiv`, `.btnStyle`
- `.typeofLeaveDiv`, `.heading`
- `.datesContainer`, `.dateDiv`, `.leaveDaysDiv`
- `.notesSection`, `.inputDes`, `.inputReason`
- `.unpaidLeaveHeading` (alerts)
- `.approverDiv`, `.headingApprover`

---

## Future Improvements Noted in Code

1. **Commented Out**: Holiday working hours validation for comp-off
   ```javascript
   // Lines 140-146: Validation logic exists but is commented
   ```

2. **Hardcoded Year**: Year is hardcoded to 2025
   ```javascript
   const year = 2025; // Line 58 - Should be dynamic
   ```

3. **Console Logs**: Debug console logs present
   ```javascript
   console.log("response", response.data.approver) // Line 507
   ```

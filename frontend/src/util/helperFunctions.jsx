// function to convert date to DD-Mmm-YYYY format in Indian Standard Time
export const convertDate = (date) => {
    // date format from api is dd-mm-yyyy
    const temp = date.split('-');
    let d = new Date(temp[2], temp[1] - 1, temp[0]);
    // let d = new Date(date);
    // if (d == 'Invalid Date') {
    // }
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
}

export const getWeekDay = (date) => {
    // date format from api is dd-mm-yyyy
    const temp = date.split('-');
    let d = new Date(temp[2], temp[1] - 1, temp[0]);
    const options = { weekday: 'long' };
    return d.toLocaleDateString('en-IN', options);
}
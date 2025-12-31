// function to convert date to DD-Mmm-YYYY format in Indian Standard Time
export const convertDate = (date) => {
    // date format from api is dd-mm-yyyy
    let d = new Date(date);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
}

export const getWeekDay = (date) => {
    // date format from api is dd-mm-yyyy
    let d = new Date(date);
    const options = { weekday: 'long' };
    return d.toLocaleDateString('en-IN', options);
}
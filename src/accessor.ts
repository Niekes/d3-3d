export const getAccessor = (value: any): Function => {
    return typeof value === 'function' ? value : () => Number(value);
};

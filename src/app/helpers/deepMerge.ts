// Helper function to deeply merge objects
export const deepMerge = (target: any, source: any): any => {
    if (typeof source !== "object" || source === null) {
        return source;
    }

    const output = { ...target };

    Object.keys(source).forEach((key) => {
        if (typeof source[key] === "object" && source[key] !== null) {
            if (!(key in target)) {
                Object.assign(output, { [key]: source[key] });
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            Object.assign(output, { [key]: source[key] });
        }
    });

    return output;
};

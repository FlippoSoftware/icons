export function isHex(value) {
    return /^#[0-9a-f]{3,6}$/i.test(value);
}

export function kebabCaseToCamelCase(name) {
    return name.replace(/^\w|_\w/g, (match) => match.replace('_', '').toUpperCase());
}

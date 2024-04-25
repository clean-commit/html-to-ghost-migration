import fetch from 'node-fetch';

export function recursivelyRemoveEmptyElements(element) {
  if (element.children().length === 0 && element.text().trim() === '') {
    const parent = element.parent();
    element.remove();
    return recursivelyRemoveEmptyElements(parent);
  } else {
    return;
  }
}

export const checkIfImageExists = async (url) => {
  try {
    const response = await fetch(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

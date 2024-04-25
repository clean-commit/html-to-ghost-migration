import fetch from 'node-fetch';
import cliProgress from 'cli-progress';

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
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const initiateProgressBar = () => {
  return new cliProgress.SingleBar(
    {
      format:
        ' {bar} | {percentage}% | {eta_formatted} | {value}/{total} | {title} ',
    },
    cliProgress.Presets.shades_classic,
  );
};

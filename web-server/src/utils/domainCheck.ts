export const checkDomainWithRegex = (domain: string) => {
  const regex =
    /^(https?:\/\/)[A-Za-z0-9]+([-.][A-Za-z0-9]+)*\.[A-Za-z]{2,}(:[0-9]{1,5})?(\/\S*)?$/;
  return regex.test(domain);
};

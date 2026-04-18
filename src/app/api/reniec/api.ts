import axios from 'axios';

const API_TOKEN = 'ddd11e7aa5cc56a6c8a1f60c0aee35085ca826ea61594ebcdd706c4f1572ea2a';
const BASE_URL = 'https://apiperu.dev/api';

const fetchData = async (endpoint) => {
  const apiUrl = `${BASE_URL}${endpoint}?api_token=${API_TOKEN}`;

  try {
    const response = await axios.get(apiUrl, {
      httpsAgent: {
        rejectUnauthorized: false,
      },
    });

    const { data } = response;
    if (data.success) {
      return data.data;
    } else {
      throw new Error('No se encontraron registros.');
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

export const fetchDniData = async (dni) => {
  return await fetchData(`/dni/${dni}`);
};

export const fetchRucData = async (ruc) => {
  return await fetchData(`/ruc/${ruc}`);
};
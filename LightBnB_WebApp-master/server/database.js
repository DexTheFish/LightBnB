const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
  .query(`SELECT * FROM users WHERE email LIKE $1 LIMIT 1`, [email])
  .then((result) => {
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null
    }
  })
  .catch((err) => { 
    console.log(err.message);
  });
}
exports.getUserWithEmail = getUserWithEmail;


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id])
  .then((result) => {
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null;
    }
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const queryString = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`
  const values = Object.values(user);
  return pool
  .query(queryString, values)
  .then((result) => {
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null;
    }
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString = `SELECT reservations.*, properties.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;
  const values = [ guest_id, limit ];
  return pool
  .query(queryString, values)
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function (options, limit = 10) {
  
  const queryParams = [];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;
  // restrict the query based on the options
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    if (queryParams.length > 1) {
      queryString += `AND city LIKE $${queryParams.length} `;
    } else {
      queryString += ` WHERE city LIKE $${queryParams.length} `;
    }
  }
  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    if (queryParams.length > 1) {
      queryString += `AND owner_id = $${queryParams.length} `;
    } else {
      queryString += ` WHERE owner_id = $${queryParams.length} `;
    }
  }
  if (options.minimum_price_per_night) {
    queryParams.push(`%${options.minimum_price_per_night}%`);
    if (queryParams.length > 1) {
      queryString += `AND cost_per_night >= 100 * $${queryParams.length} `;
    } else {
      queryString += ` WHERE cost_per_night >= 100 * $${queryParams.length} `;
    }
  }
  if (options.maximum_price_per_night) {
    queryParams.push(`%${options.maximum_price_per_night}%`);
    if (queryParams.length > 1) {
      queryString += `AND cost_per_night <= 100 * $${queryParams.length} `;
    } else {
      queryString += ` WHERE cost_per_night <= 100 * $${queryParams.length} `;
    }
  }
  if (options.minimum_rating) {
    queryParams.push(`%${options.minimum_rating}%`);
    if (queryParams.length > 1) {
      queryString += `AND average_rating > $${queryParams.length} `;
    } else {
      queryString += ` WHERE average_rating > $${queryParams.length} `;
    }
  }

  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams).then((res) => res.rows)
  .catch((err) => {
    console.log(err.message);
  });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;

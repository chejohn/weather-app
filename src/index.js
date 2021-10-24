import '@babel/polyfill';

// returns a Promise that resolves to latitude and longitude;
const getGeoData = async (defaultLocation) => {
  let locationData;
  if (defaultLocation === true) {
    locationData = 'New York';
  } 
  else {
    locationData = GlobalNodes.input.value.replace(/\s+/g, '');
    if (locationData === '') return;
  }

  const responseObj = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${locationData}&key=AIzaSyBWnL4ZgYQmKH84rhMmlPs6eV2xLEHS-zE`,
    { mode: 'cors' }
  );
  const locationObj = await responseObj.json();
  const city = locationObj.results[0]['formatted_address'].match(/^([^,])+/)[0];
  const latitude = locationObj.results[0].geometry.location.lat;
  const longitude = locationObj.results[0].geometry.location.lng;
  return [latitude, longitude, city];
}

const getWeatherData = async (latitude, longitude) => {
  const responseObj = await fetch(
    `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,alerts&units=imperial&appid=0c0e7e85e0b79f8172ab494cd0e6830a`,
    {mode: 'cors'}
  );
  const weatherObj = await responseObj.json();
  return weatherObj;
}

const convertToLocalTime = (unixTime, appendMinutes = false) => {
  const dateObj = new Date(unixTime * 1000);
  const militaryHour = dateObj.getHours();
  let minutes;
  if (appendMinutes) {
    minutes = dateObj.getMinutes();
    if (minutes < 10) {
      minutes = `0${minutes}`;
    }
  }

  let normalTime;
  if (militaryHour > 12) {
    if (appendMinutes) {
      normalTime = `${militaryHour - 12}:${minutes} pm`;
    }
    else {
      normalTime = `${militaryHour - 12} pm`;
    }
  }
  else if (militaryHour === 12) {
    if (appendMinutes) {
      normalTime = `12:${minutes} pm`;
    }
    else {
      normalTime = `12 pm`;
    }
  }
  else if (militaryHour === 0) {
    if (appendMinutes) {
      normalTime = `12:${minutes} am`;
    }
    else {
      normalTime = `12 am`;
    }
  }
  else {
    if (appendMinutes) {
      normalTime = `${militaryHour}:${minutes} am`
    }
    else {
      normalTime = `${militaryHour} am`;
    }
  }
  return normalTime;
}

const convertToDay = (unixTime) => {
  const date = new Date(unixTime * 1000);
  let day;

  switch(date.getDay()) {
    case 0: 
      day = 'Sunday';
      break;
    case 1:
      day = 'Monday';
      break;
    case 2: 
      day = 'Tuesday';
      break;
    case 3:
      day = 'Wednesday';
      break;
    case 4:
      day = 'Thursday';
      break;
    case 5:
      day = 'Friday';
      break;
    case 6:
      day = 'Saturday';
      break;
  }
  return day;
}

const convertToPercent = (number) => `${Math.floor(number * 100)}%`;

const convertToWindVector = (windSpeed, windDegrees) => {
  let direction;
  let newWindSpeed = Math.floor(windSpeed);
  if (windDegrees === 360 || windDegrees >= 0 && windDegrees < 45) {
    direction = 'N';
  } else if (windDegrees >= 45 && windDegrees < 90) {
    direction = 'NE';
  } else if (windDegrees >= 90 && windDegrees < 135) {
    direction = 'E';
  } else if (windDegrees >= 135 && windDegrees < 180) {
    direction = 'SE'
  } else if (windDegrees >= 180 && windDegrees < 225) {
    direction = 'S'
  } else if (windDegrees >= 225 && windDegrees < 270) {
    direction = 'SW';
  } else if (windDegrees >= 270 && windDegrees < 315) {
    direction = 'W';
  } else if (windDegrees >= 315 && windDegrees < 360) {
    direction = 'NW';
  }
  return `${direction} ${newWindSpeed} mph`;
}

// if rainFall data is present, convert it to cm
const getRainData = (rainFall) => `${Math.floor(rainFall * 10)} cm`;

const toVisibilityInMiles = (meters) => `${Math.floor(meters/1610)} m`;

const filterForCurrentData = (weatherObj) => {
  const currentData = weatherObj.current;

  let precipitation;
  const sunrise = convertToLocalTime(currentData.sunrise, true);
  const sunset = convertToLocalTime(currentData.sunset, true);
  const humidity = `${currentData.humidity}%`;
  const windVector = convertToWindVector(currentData.wind_speed, currentData.wind_deg);
  const feelsLike = `${Math.floor(currentData.feels_like)}&deg;`;
  
  try {
    precipitation = getRainData(currentData.rain['1h']);
  }
  catch {
    precipitation = `0 cm`;
  }

  const pressure = `${currentData.pressure} hPa`;
  const visibility = toVisibilityInMiles(currentData.visibility);
  const uvIndex = `${currentData.uvi}`;
  const temp = `${Math.floor(currentData.temp)}&deg;`;
  const weatherState = currentData.weather[0].main;
  return {sunrise, 
    sunset, 
    humidity, 
    windVector, 
    feelsLike, 
    precipitation,
    pressure, 
    visibility,
     uvIndex, 
     temp, 
     weatherState
    }
}

const filterForHourlyData = (iteration, weatherObj) => {
  const hourlyData = weatherObj.hourly[iteration];
  
  const time = convertToLocalTime(hourlyData.dt);
  const chanceOfRain = convertToPercent(hourlyData.pop);
  const temp = `${Math.floor(hourlyData.temp)}&deg;`
  const weatherIcon = hourlyData.weather[0].icon;
  return {
    time, 
    chanceOfRain,
    temp,
    weatherIcon
  }
}

const filterForDailyData = (iteration, weatherObj) => {
  const dailyData = weatherObj.daily[iteration];
  let nightTemp;
  let weatherState;

  if (iteration === 0) {
    nightTemp = `${Math.floor(dailyData.temp.night)}&deg;`;
    weatherState = dailyData.weather[0].description;
  }
  const chanceOfRain = convertToPercent(dailyData.pop);
  const highTemp = `${Math.floor(dailyData.temp.max)}&deg;`;
  const lowTemp = `${Math.floor(dailyData.temp.min)}&deg;`;
  const humidity = `${dailyData.humidity}%`;
  const weatherIcon = dailyData.weather[0].icon;
  const day = convertToDay(dailyData.dt);
  return {
    chanceOfRain,
    highTemp,
    lowTemp,
    humidity,
    weatherIcon,
    day,
    nightTemp,
    weatherState
  }
}

const convertToCelcius = (fahrenheit) => {
  const rawNumber = fahrenheit.match(/(\d+)/)[0];
  return `${Math.floor((rawNumber - 32) * 5/9)}&deg;`;
}

const updateTempInterface = (tempReading) => {
  const TempData = GlobalNodes.tempData[tempReading];
  GlobalNodes.currentInterface1.children[3]
    .innerHTML = `H:${TempData.daily.today.high} L:${TempData.daily.today.low}`;
  GlobalNodes.currentInterface1.children[2]
    .innerHTML = TempData.current.temp;

  const weatherState = GlobalNodes.weatherDescription.innerHTML.match(/^([^.]+)/)[0];
  GlobalNodes.weatherDescription
    .innerHTML = `${weatherState}. The high will be ${TempData.daily.today.high}. The low tonight will be ${TempData.daily.today.nightTemp}.`;

  GlobalNodes.currentInterface2[5].innerHTML = TempData.current.feelsLike;

  for (let i = 0; i < GlobalNodes.hourlyInterface.length; i++) {
    const hourlyEntry = GlobalNodes.hourlyInterface[i];
    hourlyEntry.children[3].innerHTML = TempData.hourly[i];
  }

  for (let i = 0; i < GlobalNodes.weekTemp.length; i++) {
    GlobalNodes.weekTemp[i].innerHTML = `${TempData.daily.week.high[i]} ${TempData.daily.week.low[i]}`;
  }
} 

const changeTemp = (toggle = true) => {
  if (toggle) {
    GlobalNodes.celcius.classList.toggle('current-temp');
    GlobalNodes.fahrenheit.classList.toggle('current-temp');
  }
  if (GlobalNodes.celcius.classList.length > 1) {
    updateTempInterface('celcius');
  }
  else updateTempInterface('fahrenheit');
}

const storeTempData = (Data, period) => {
  const fahrenheitContainer = GlobalNodes.tempData.fahrenheit;
  const celciusContainer = GlobalNodes.tempData.celcius;
  if (period === 'current') {
    fahrenheitContainer.current = {};
    celciusContainer.current = {};
    const fahrenheitTemp = Data.temp;
    const fahrenheitFeelsLike = Data.feelsLike;

    fahrenheitContainer.current.temp = fahrenheitTemp;
    fahrenheitContainer.current.feelsLike = fahrenheitFeelsLike;
    celciusContainer.current.temp = convertToCelcius(fahrenheitTemp);
    celciusContainer.current.feelsLike = convertToCelcius(fahrenheitFeelsLike);
  }
  else if (period === 'hourly') {
    if (!fahrenheitContainer.hourly && !celciusContainer.hourly) {
      fahrenheitContainer.hourly = [];
      celciusContainer.hourly = [];
    }
    fahrenheitContainer.hourly.push(Data.temp);
    celciusContainer.hourly.push(convertToCelcius(Data.temp));
  }
  else {
    if (!fahrenheitContainer.daily && !celciusContainer.daily) {
      fahrenheitContainer.daily = {};
      celciusContainer.daily = {};
      fahrenheitContainer.daily.today = 
        {
          nightTemp: Data.nightTemp,
          high: Data.highTemp,
          low: Data.lowTemp
        };
      fahrenheitContainer.daily.week = 
        {
          high: [],
          low: []
        };
      celciusContainer.daily.today = 
        {
          nightTemp: convertToCelcius(Data.nightTemp),
          high: convertToCelcius(Data.highTemp),
          low: convertToCelcius(Data.lowTemp)
        };
      celciusContainer.daily.week = 
        {
          high: [],
          low: []
        };
    } 
    else {
      fahrenheitContainer.daily.week.high.push(Data.highTemp);
      fahrenheitContainer.daily.week.low.push(Data.lowTemp);
      celciusContainer.daily.week.high.push(convertToCelcius(Data.highTemp));
      celciusContainer.daily.week.low.push(convertToCelcius(Data.lowTemp));
    }
  }
}

const updateCurrentComponent = (weatherObj, location) => {
  const CurrentData = filterForCurrentData(weatherObj);
  storeTempData(CurrentData, 'current');
  const currentInterfaceArr = GlobalNodes.currentInterface1.children;
  currentInterfaceArr[0].textContent = location;
  currentInterfaceArr[1].textContent = CurrentData.weatherState;
  currentInterfaceArr[2].innerHTML = CurrentData.temp;

  const currentInterface2Arr = GlobalNodes.currentInterface2;
  currentInterface2Arr[0].textContent = CurrentData.sunrise;
  currentInterface2Arr[1].textContent = CurrentData.sunset;
  currentInterface2Arr[3].textContent = CurrentData.humidity;
  currentInterface2Arr[4].textContent = CurrentData.windVector;
  currentInterface2Arr[5].innerHTML = CurrentData.feelsLike;
  currentInterface2Arr[6].textContent = CurrentData.precipitation;
  currentInterface2Arr[7].textContent = CurrentData.pressure;
  currentInterface2Arr[8].textContent = CurrentData.visibility;
  currentInterface2Arr[9].textContent = CurrentData.uvIndex;
}

const updateHourlyComponent = (weatherObj) => {
  const hourlyInterfaceArr = GlobalNodes.hourlyInterface;
  for (let i = 0; i < hourlyInterfaceArr.length; i++) {
    const HourlyData = filterForHourlyData(i, weatherObj);
    storeTempData(HourlyData, 'hourly');
    const hourlyEntry = hourlyInterfaceArr[i];
    if (i !== 0) {
      hourlyEntry.children[0].textContent = HourlyData.time;
    }
    hourlyEntry.children[1].textContent = HourlyData.chanceOfRain;
    hourlyEntry.children[2].src = `https://openweathermap.org/img/wn/${HourlyData.weatherIcon}@4x.png`;
    hourlyEntry.children[3].innerHTML = HourlyData.temp;
  }
}

const updateDailyComponent = (weatherObj) => {
  for (let i = 0; i < 8; i++) {
    const DailyData = filterForDailyData(i, weatherObj);
    storeTempData(DailyData, 'daily');
    if (i === 0) {
      const highTemp = DailyData.highTemp;
      GlobalNodes.currentInterface1.children[3].innerHTML = `H:${highTemp} L:${DailyData.lowTemp}`;

      GlobalNodes.weatherDescription
      .innerHTML = `Today: ${DailyData.weatherState}. The high will be ${highTemp}. The low tonight will be ${DailyData.nightTemp}.`;

      GlobalNodes.currentInterface2[2].textContent = `${DailyData.chanceOfRain}`;
    }
    else {
      const currentDay = GlobalNodes.daysOfTheWeek[i - 1];
      currentDay.children[0].textContent = DailyData.day;
      currentDay.children[1].src = `https://openweathermap.org/img/wn/${DailyData.weatherIcon}@4x.png`;
      
      GlobalNodes.weekChanceOfRain[i - 1].textContent = DailyData.chanceOfRain;

      GlobalNodes.weekHumidity[i - 1].textContent = DailyData.humidity;

      GlobalNodes.weekTemp[i - 1].innerHTML = `${DailyData.highTemp} ${DailyData.lowTemp}`;
    }
  }
}

const runApp = async (defaultLocation = false) => {
  document.body.appendChild(GlobalNodes.loadingInterface);
  GlobalNodes.tempData = { fahrenheit: {}, celcius: {} };
  const [latitude, longitude, location] = await getGeoData(defaultLocation);
  const weatherObj = await getWeatherData(latitude, longitude);
  updateCurrentComponent(weatherObj, location);
  updateHourlyComponent(weatherObj);
  updateDailyComponent(weatherObj);
  if (GlobalNodes.celcius.classList.length > 1) {
    changeTemp(false);
  }
  GlobalNodes.loadingInterface.remove();
};

const GlobalNodes = (() => {
  const input = document.querySelector('input');
  const searchBttn = document.querySelector('.search-bttn');
  const currentInterface1 = document.querySelector('.current-interface-1');
  const currentInterface2 = document.querySelectorAll('.current-interface-2');
  const hourlyInterface = document.querySelectorAll('.hourly-status-panel');
  const daysOfTheWeek = document.querySelectorAll('.week-status-flex');
  const weekChanceOfRain = document.querySelectorAll('#chance-of-rain');
  const weekHumidity = document.querySelectorAll('#humidity');
  const weekTemp = document.querySelectorAll('.temp');
  const weatherDescription = document.querySelector('.current-weather-statement');
  const tempBtn = document.querySelector('.temp-bttn');
  const celcius = document.querySelector('.celcius');
  const fahrenheit = document.querySelector('.fahrenheit');
  const loadingInterface = document.querySelector('.loader-container');
  loadingInterface.remove();
  let tempData;
  return { 
    input, 
    searchBttn, 
    currentInterface1,
    currentInterface2,
    hourlyInterface,
    daysOfTheWeek,
    weekChanceOfRain,
    weekHumidity,
    weekTemp,
    weatherDescription,
    loadingInterface,
    tempBtn,
    celcius,
    fahrenheit,
    tempData
  };
})();

const AttachEventListeners = (() => {
  GlobalNodes.searchBttn.addEventListener('click', runApp);
  GlobalNodes.tempBtn.addEventListener('click', changeTemp);
})();

runApp(true);





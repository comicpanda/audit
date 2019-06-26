let $trs; 
let $blank;
let currentPos = 0;
let maxPos = -1;
let currentAssignee = -1;
let currentSeriesIdx = -1;

const showView = (id) => {
    const viewId = id.replace('#', '');
    const $view = document.getElementById(viewId); 
    if ($view) {
        hideLoading();
        $view.classList.remove('d-none');
        const $footer = document.querySelector(`.js-${viewId}-footer`);
        if ($footer) {
            $footer.classList.remove('d-none');
        }
    }
}

const toggleLoading = (hide) => {
    const $loading = document.querySelector('.js-loading');
    if (hide) {
        $loading.classList.add('d-none');
    } else {
        $loading.classList.remove('d-none');
    }
}

const hideLoading = () => toggleLoading(true); 
const showLoading = () => toggleLoading(false);

const fetchData = async (url, options) => {
    const json = await fetch(url, options || {})
        .then(res => {
            if (res.status !== 200) {
                alert('Please reload the page..');
                return;
            }
            return res.json();
        })
        .catch(err => {
            alert('Error. Please reload the page.');
        });

    return json;
}

const bindData = (idx, assignee) => {
    const $checkbox = document.querySelector('.js-checkbox');
    $checkbox.dataset.idx = idx;
    $checkbox.checked = true; 
    document.querySelector('.js-back-to-list').href = `./?assignee=${assignee}#series-list-view`;
    currentAssignee = assignee;
    currentSeriesIdx = idx;

    const series = JSON.parse(window.localStorage.getItem(currentAssignee));
    const pos = series.map(s => s.idx).indexOf(currentSeriesIdx);
    document.querySelector('.js-series-title').innerHTML = series[pos].title;
    const $badge = document.querySelector('.js-status-badge');
    $badge.innerHTML = series[pos].status; 
    $badge.parentElement.classList.add(`status-${series[pos].status}`)
}

const loadEpisodesData = async (seriesId) => 
    await fetchData(`https://audit.tapas.io/series/${seriesId}`).then(data => data);

const loadSeriesData = async (assignee) => {
    const db = window.localStorage;
    let seriesData = null;

    if (db.getItem('updated') === null) {
        seriesData = db.getItem(assignee);
    } else {
        db.removeItem('updated');
    }

    if (seriesData === null) {
        // seriesData = await fetchData('./public/data.json')
        seriesData = await fetchData('https://spreadsheets.google.com/feeds/list/1GRzc5BMG8F_y9ZsB8Ed0crSIQ5HJpUwM1qsu4mD5l68/default/public/values?alt=json')
        .then(data => {
            const list = data.feed.entry.filter(entry => entry.gsx$assignee.$t === assignee)
                .map(filteredData => ({
                    idx: filteredData.gsx$idx.$t,
                    id: filteredData.gsx$id.$t,
                    title: escapeHtml(filteredData.gsx$title.$t),
                    status: filteredData.gsx$status.$t || 'R',
                }));
            db.setItem(assignee, JSON.stringify(list));
            return list;
        });
        return seriesData;
    } else {
        return JSON.parse(seriesData);
    }
}

const setObserve = () => {
    const options = {
        root: document.querySelector('#root'),
        rootMargin: '0px',
        threshold: 0.1
    }

    const callback = function (entries, observer) { 
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const $img = entry.target;
                $img.src = $img.dataset.src;
                observer.unobserve($img);
            }
        });
    };

    var observer = new IntersectionObserver(callback, options);
    document.querySelectorAll('.img').forEach($img => observer.observe($img));
}

const drawEpisodeContents = (data) => {
    const $grid = document.querySelector('.episode-grid');
    const blankSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8UQ8AAjUBWXO9i8oAAAAASUVORK5CYII=';
    let episodes = '';

    data.forEach(ep => {
        episodes += `<div class="item"><a href="https://tapas.io/episode/${ep.id}" target="_blank"><img class="img" src="${blankSrc}" data-src="https://d30womf5coomej.cloudfront.net/${ep.file_path.replace('.','_z.')}" width=200 height=${ep.height*200/ep.width}></a></div>`;
    });

    $grid.innerHTML += episodes;
}

const drawSeriesTable = (data) => {
    const $seriesTBody = document.querySelector('.series-table tbody');
    let tbody = '';
    data.forEach(series => {
        tbody += `<tr class="status-${series.status}">
            <td><input class="checkbox js-a-checkbox" type="checkbox" data-idx="${series.idx}"></td>
            <td><a href="https://tapas.io/series/${series.id}" target="_blank">${series.id}</a</td>
            <td><a href="#" data-id="${series.id}" data-idx="${series.idx}" class="title" title="${series.title}">${series.title}</a</td>
            <td><span class="badge">${series.status}</span></td>
        </tr>`;
        maxPos++;
    });
    $seriesTBody.innerHTML = tbody;
    $trs = $seriesTBody.getElementsByTagName('tr');
    $trs[currentPos].classList.add('points');
    
    const total = $trs.length;
    let listed = total;

    document.getElementById('status-filter').onchange = function () {
        const trs = Array.from($trs);
        trs.forEach(tr => {
            tr.classList.remove('d-none');    
        });
        if (this.value !== 'A') {
            const filteredTrs = trs.filter(tr => !tr.classList.contains(`status-${this.value}`));
            filteredTrs.forEach(tr => tr.classList.add('d-none'));
            listed = total - filteredTrs.length;
            updateCounts(total, listed);
        }
    }

    document.querySelector('.js-all-checkbox').onchange = function (e) {
        document.querySelectorAll('.js-a-checkbox').forEach($checkbox => $checkbox.checked = this.checked);
        updateCountOnFooter();
    }
    updateCounts(total, listed);
    setEventsOnSeriesTable();
}

const goToDetailedView = (ds) => {
    window.location.href = `./?id=${ds.id}&idx=${ds.idx}&assignee=${currentAssignee}#detailed-view`;
}

const setEventsOnSeriesTable = () => {
    for ($tr of $trs) {
        $tr.querySelector('.js-a-checkbox').onchange = function (e) {
            updateCountOnFooter();
        }
        $tr.querySelector('a.title').onclick = function (e) {
            e.preventDefault();
            goToDetailedView(this.dataset);
        } 
    }
}

const setEventsOnFooter = (callbackForActions) => {
    document.querySelectorAll('.js-filtering').forEach($a => {
        $a.onclick = function (e) {
            e.preventDefault();
            if ($a.dataset.selector === 'all') {
                document.querySelectorAll('.js-a-checkbox').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.remove('d-none');
                });
            } else {
                document.querySelectorAll('.js-a-checkbox').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.add('d-none');
                });
                document.querySelectorAll('.js-a-checkbox:checked').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.remove('d-none');
                });
            }
       };
    });
    document.querySelectorAll('.footer__btns .btn').forEach($btn => {
        if ($btn.dataset.status) {
            $btn.onclick = () => updateStatus($btn.dataset.status, callbackForActions);
        } else if ($btn.dataset.nav) {
            $btn.onclick = () => moveToSeries($btn.dataset.nav === 'next');
        }
    });
}

const updateStatus = (status, callback) => {
    const $checkes = document.querySelectorAll('.js-a-checkbox:checked, .js-checkbox:checked');
    if ($checkes.length > 0) {
        const onDetailedView = $checkes[0].classList.contains('js-checkbox');
        const statusLabel = (status === 'P' ? 'Pass' : (status === 'B' ? 'Block' : 'Spam'));
        if(confirm(`${statusLabel} - Confirm?`)) {
            const $saving = document.querySelector(`.js-${onDetailedView ? 'detailed' : 'series-list'}-view-footer .js-saving`);
            $saving.classList.remove('d-none');
            let body = [];
            $checkes.forEach($check => {
                body.push({
                    range: $check.dataset.idx,
                    status
                })
            })
            fetch('https://audit.tapas.io/sheets', {
                method: 'post',
                body: JSON.stringify(body)
            }).then(res => {
                $saving.classList.add('d-none');
                const db = window.localStorage;
                db.setItem('updated', 'true');
                callback.call(this, {status});
                if (!onDetailedView) {
                    $checkes.forEach($checkbox => $checkbox.checked = false);
                    updateCountOnFooter();
                }
            }).catch(err => {
                console.error(err);
                alert('Error. Please try it again. : updateStatus');
            });
        }
    } else {
        alert('Select a series or more..');
    }
}

const updateCounts = (total, listed) => {
    document.querySelector('.counts').innerHTML = `total : ${total} series / listed : ${listed} series`;
}

const updateCountOnFooter = () => {
    document.querySelector('.footer__info .num').innerHTML = document.querySelectorAll('.js-a-checkbox:checked').length; 
}

const updateStatusLabel = (data) => {
    document.querySelectorAll('.js-a-checkbox:checked').forEach($check => {
        const $badge = $check.parentElement.parentElement.querySelector('.badge');
        const currentStatus = $badge.innerText;
        $badge.innerText = data.status;
        $check.parentElement.parentElement.classList.replace(`status-${currentStatus}`, `status-${data.status}`);
    });
}

const moveToNextSeries = () => moveToSeries(true);

const moveToSeries = (next) => {
    const db = window.localStorage;
    const series = JSON.parse(db.getItem(currentAssignee));
    const pos = series.map(s => s.idx).indexOf(currentSeriesIdx);
    if (!next && pos === 0) {
        alert('This series is the first one.');
    } else if (next && series.length === pos -1) {
        alert('This series is the last one.');
    } else {
        goToDetailedView(series[pos + (next ? 1 : -1)]);
    }
}

const navigate = (go) => {
    if ((go === 'up' && currentPos > 0) || (go === 'down' && currentPos < maxPos)) {
        $trs[currentPos].classList.remove('points');
        currentPos = currentPos + (go === 'up' ? -1 : 1);
        $trs[currentPos].classList.add('points');
        $trs[currentPos].scrollIntoView({block: 'center'});
    } else if (go === 'select') {
        const $checkbox = $trs[currentPos].querySelector('.checkbox');
        $checkbox.checked = !$checkbox.checked;
        updateCountOnFooter();
    } else if (go === 'enter') {
        goToDetailedView($trs[currentPos].querySelector('a.title').dataset);
    } else if (go === 'pageDown' || go === 'pageUp') {
        window.scrollBy(0, document.documentElement.clientHeight * (go === 'pageUp' ? -1 : 1));
    } else if (go === 'prevSeries' || go === 'nextSeries') {
        moveToSeries(go === 'nextSeries');
    } else if (go === 'goBackToList') {
        window.location.href = document.querySelector('.js-back-to-list').href;
    }
}

const startShortcutsForEpisodeNav = () => {
    document.onkeydown = (e) => {
        const keyCode = e.which;
        switch (keyCode) {
            case 40:  //↓
            case 74:  //j
                navigate('pageDown');
                break;
            case 38: //↑
            case 75: //k
                navigate('pageUp');
                break;
            case 37: //←
            case 72: //h
                navigate('prevSeries');
                break;
            case 39: //→
            case 76: //l
                navigate('nextSeries');
                break;
            case 85: //u
                navigate('goBackToList');
                break;
            case 66: //b
            case 83: //s
            case 80: //p
                updateStatus(keyCode === 66 ? 'B': (keyCode === 83 ? 'S' : 'P'), moveToNextSeries);
                break;
            default:
                break;
        }
    };
}

const startShortcutsForListNav = () => {
    document.onkeydown = (e) => {
        const keyCode = e.which;
        switch (keyCode) {
            case 40:  //↓
            case 74:  //j
                navigate('down');
                break;
            case 38: //↑
            case 75: //k
                navigate('up');
                break;
            case 88: //x
                navigate('select');
                break;
            case 10: //enter
            case 13: //enter
                //go to detail
                e.preventDefault();
                navigate('enter');
                break;
            case 66: //b
            case 83: //s
            case 80: //p
                updateStatus(keyCode === 66 ? 'B': (keyCode === 83 ? 'S' : 'P'), updateStatusLabel);
                break;
            case 68:
                window.localStorage.clear();
                break;
            default:
                break;
        }
    };
}

const updateAssigneeName = () => {
    document.querySelector('.js-assignee-name').innerText = assigneeData[currentAssignee]['name'];
}

const delegatePage = () => {
    const locationHash = window.location.hash || '#assignee-view';
    let params = (new URL(document.location)).searchParams;
    if (locationHash === '#assignee-view') {
        const $selectBox = document.getElementById('assignees');
        assigneeData.forEach(assignee => {
            const $option = document.createElement("option");
            $option.text = assignee.name;
            $option.value = assignee.id;
            $selectBox.appendChild($option);
        });
        showView(locationHash);
    } else if (locationHash === '#series-list-view') {
        currentAssignee = params.get('assignee');
        loadSeriesData(currentAssignee)
            .then(data => {
                showView(locationHash);
                drawSeriesTable(data);
                setEventsOnFooter(updateStatusLabel);
                startShortcutsForListNav();
                updateAssigneeName();
            }).catch(err => {
                window.localStorage.clear();
                console.log(err);
                alert('loadSeriesData : Please try it again.');
                window.location.href = './';
            });
    } else if (locationHash === '#detailed-view') {
        loadEpisodesData(params.get('id'))
            .then(data => {
                showView(locationHash); 
                bindData(params.get('idx'), params.get('assignee'))
                drawEpisodeContents(data);
                setEventsOnFooter(moveToNextSeries);
                setObserve();
                startShortcutsForEpisodeNav();
            }).catch(err => {
                console.log(err);
                alert('loadEpisodesData : Please try it again.');
                window.location.href = `./?assignee=${currentAssignee}#series-list-view`;
            });
    }
}

const escapeHtml = (text) => {
    if (!$blank) {
        $blank = document.getElementById('blank');
    }
    $blank.innerText = text;
    return $blank.innerHTML;
}

const init = () => {
    delegatePage();
}
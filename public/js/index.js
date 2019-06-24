let $trs; 
let currentPos = 0;
let maxPos = -1;

const showView = (id) => {
    document.querySelectorAll('.js-view, .js-footer').forEach($el => {
        $el.classList.add('d-none');
    });

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
    const $loading = document.querySelector('.loading');
    if (hide) {
        $loading.classList.add('d-none');
    } else {
        $loading.classList.remove('d-none');
    }
}

const hideLoading = () => {
    toggleLoading(true)
}

const showLoading = () => {
    toggleLoading(false)
}

const fetchData = async (url) => {
    const json = await fetch(url)
        .then(res => {
            if (res.status !== 200) {
                alert('Please reload the page.');
                return;
            }
            return res.json();
        })
        .catch(err => {
            alert('Error. Please reload the page.');
        });

    return json;
}

const loadSeriesData = async (assignee) => {
    // const seriesData = await fetchData('https://spreadsheets.google.com/feeds/list/1GRzc5BMG8F_y9ZsB8Ed0crSIQ5HJpUwM1qsu4mD5l68/default/public/values?alt=json')
    const db = window.localStorage;
    let seriesData = db.getItem(assignee);
    if (seriesData === null) {
        seriesData = await fetchData('./public/data.json')
        .then(data => {
            const list = data.feed.entry.filter(entry => entry.gsx$assignee.$t === assignee)
                .map(filteredData => ({
                    idx: filteredData.gsx$idx.$t,
                    id: filteredData.gsx$id.$t,
                    title: filteredData.gsx$title.$t,
                    status: filteredData.gsx$status.$t || 'R',
                }));
            return list;
        });
    } 
    return seriesData;
}

const drawSeriesTable = (data) => {
    const $seriesTBody = document.querySelector('.series-table tbody');
    let tbody = '';
    data.forEach(series => {
        tbody += `<tr class="status-${series.status}">
            <td><input class="checkbox" type="checkbox" data-idx="${series.idx}"></td>
            <td><a href="https://tapas.io/series/${series.id}" target="_blank">${series.id}</a</td>
            <td><a href="#" data-id="${series.id}" data-idx="${series.idx}" class="title">${series.title}</a</td>
            <td><span class="badge">${series.status}</span></td>
        </tr>`;
        maxPos++;
    });
    $seriesTBody.innerHTML = tbody;
    $trs = $seriesTBody.getElementsByTagName('tr');
    $trs[currentPos].classList.add('points');
    
    const total = $trs.length;
    let listed = total;

    document.getElementById('status-filter').onchange = function() {
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
    updateCounts(total, listed);
    setEventsOnSeriesTable();
}

const goToDetailedView = (ds) => {
    console.log('goToDetailed... ', ds.id, ds.idx);
    window.history.pushState({id: ds.id, idx: ds.idx}, 'audit.tapas.io', `/?id=${ds.id}&idx=${ds.idx}#detailed-view`);
}

const setEventsOnSeriesTable = () => {
    for ($tr of $trs) {
        $tr.querySelector('input.checkbox').onchange = function(e) {
            updateCountOnFooter();
        }
        $tr.querySelector('a.title').onclick = function(e) {
            e.preventDefault();
            goToDetailedView(this.dataset);
        } 
    }
}

const setEventsOnFooter = () => {
    document.querySelectorAll('.js-filtering').forEach($a => {
        $a.onclick = function (e) {
            e.preventDefault();
            if ($a.dataset.selector === 'all') {
                document.querySelectorAll('input.checkbox').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.remove('d-none');
                });
            } else {
                document.querySelectorAll('input.checkbox').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.add('d-none');
                });
                document.querySelectorAll('input:checked').forEach($checkbox => {
                    $checkbox.parentElement.parentElement.classList.remove('d-none');
                });
            }
       };
    });
    document.querySelectorAll('.footer__btns .btn').forEach($btn => {
        $btn.onclick = () => updateStatus($btn.dataset.status);
    });
}

const updateStatus = (status) => {
    const $checkes = document.querySelectorAll('input:checked');
    if ($checkes.length > 0) {
        const statusLabel = (status === 'P' ? 'Pass' : (status === 'B' ? 'Block' : 'Spam'));
        if(confirm(`${statusLabel} - Confirm?`)) {
            let body = [];
            $checkes.forEach($check => {
                body.push({
                    range: $check.dataset.idx,
                    status
                })
            })
            fetch('http://localhost:3000/sheets', {
                method: 'post',
                mode: 'no-cors',
                body: JSON.stringify(body)
            }).then(res => {
                console.log(res);
            }).catch(err => {
                alert('Error. Please try it again.');
            });
        }
    }
}
const updateCounts = (total, listed) => {
    document.querySelector('.counts').innerHTML = `total : ${total} series / listed : ${listed} series`;
}

const updateCountOnFooter = () => {
    document.querySelector('.footer__info .num').innerHTML = document.querySelectorAll('input:checked').length; 
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
        const $a = $trs[currentPos].querySelector('a.title'); 
        goToDetailedView($a.dataset);
    }
}

const startShortcutsForNavListing = () => {
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
                navigate('enter');
                break;
            case 66: //b
            case 83: //s
            case 80: //p
                updateStatus(keyCode === 66 ? 'B': (keyCode === 83 ? 'S' : 'P'));
                break;
            default:
                break;

        }
    };
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
        loadSeriesData(params.get('assignee'))
            .then(data => {
                showView(locationHash);
                drawSeriesTable(data);
                setEventsOnFooter();
                startShortcutsForNavListing();
            });
    } else if (locationHash === '#detailed-view') {
        console.log('location', params.get('id'), params.get('idx'))
    }
}

const init = () => {
    window.onpopstate = function(e) {
        delegatePage();
    }
    delegatePage();
}


/// -- -detailed view page update
/// -- pass title 
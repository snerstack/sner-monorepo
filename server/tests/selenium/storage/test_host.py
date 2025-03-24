# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium ui tests for storage.host component
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from sner.server.extensions import db
from sner.server.storage.models import Host, Note, Service, Vuln, Versioninfo
from tests.selenium import dt_inrow_delete, dt_rendered, webdriver_waituntil, wait_for_js, frontend_url, toggle_dt_toolboxes
from tests.selenium.storage import (
    check_annotate,
    check_dt_toolbox_freetag,
    check_dt_toolbox_multiactions,
    check_dt_toolbox_select_rows,
    check_dt_toolbox_visibility_toggle,
    check_service_endpoint_dropdown
)


def get_host_view_tab(sclnt, host_id, model, wait_attr_value='comment'):
    """switches host view tab and waits until dt is rendered"""

    model_name = model.__class__.__name__.lower()
    dt_name = f'host_view_{model_name}_table'

    sclnt.get(frontend_url(f'/storage/host/view/{host_id}'))
    wait_for_js(sclnt)
    sclnt.find_element(
        By.XPATH,
        f'//a[@data-testid="{model_name}_tab"]'
    ).click()

    webdriver_waituntil(sclnt, EC.visibility_of_element_located((By.ID, dt_name)))
    dt_rendered(sclnt, dt_name, getattr(model, wait_attr_value))


def test_host_list_route(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """simple test ajaxed datatable rendering"""

    sl_operator.get(frontend_url('/storage/host/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'host_list_table', host.comment)


def test_host_list_route_inrow_delete(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """delete host inrow button"""

    host_id = host.id
    db.session.expunge(host)

    sl_operator.get(frontend_url('/storage/host/list'))
    wait_for_js(sl_operator)
    dt_inrow_delete(sl_operator, 'host_list_table')

    assert not db.session.get(Host, host_id)


def test_host_list_route_annotate(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """test annotation from list route"""

    sl_operator.get(frontend_url('/storage/host/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'host_list_table', host.comment)
    check_annotate(sl_operator, 'host_comment_annotate', host)


def test_host_list_route_moredata_dropdown(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """test moredata dropdown"""

    sl_operator.get(frontend_url('/storage/host/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'host_list_table', host.comment)
    sl_operator.find_element(By.ID, 'host_list_table').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//table[@id="host_list_table"]//h6[text()="More data"]'
    )))


def test_host_list_route_selectrows(frontend_server, sl_operator, hosts_multiaction):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_select_rows(sl_operator, frontend_url('/storage/host/list'), 'host_list_table')


def test_host_list_route_dt_toolbox_multiactions(frontend_server, sl_operator, hosts_multiaction):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_multiactions(sl_operator, frontend_url('/storage/host/list'), 'host_list_table', Host)


def test_host_list_route_dt_toolbox_freetag(frontend_server, sl_operator, hosts_multiaction):  # pylint: disable=unused-argument
    """test dt freetag buttons"""

    check_dt_toolbox_freetag(sl_operator, frontend_url('/storage/host/list'), 'host_list_table', Host)


def test_host_list_route_dt_toolbox_visibility_toggle(frontend_server, sl_operator, host_factory):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_visibility_toggle(sl_operator, frontend_url('/storage/host/list'), 'host_list_table', host_factory)


def test_host_edit_route_addtag(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """addtag buttons test"""

    assert 'todo' not in host.tags

    sl_operator.get(frontend_url(f'/storage/host/edit/{host.id}'))
    wait_for_js(sl_operator)
    sl_operator.find_element(By.XPATH, '//div[@data-testid="default-tags"]//a[text()="Todo"]').click()
    sl_operator.find_element(By.XPATH, '//form//input[@type="submit"]').click()

    db.session.refresh(host)
    assert 'todo' in db.session.get(Host, host.id).tags


def test_host_view_route_annotate(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """test host annotation from view route"""

    sl_operator.get(frontend_url(f'/storage/host/view/{host.id}'))
    wait_for_js(sl_operator)
    check_annotate(sl_operator, 'host_comment_annotate', host)


def test_host_view_route_moredata_dropdown(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """test host view breadcrumb ribbon moredata dropdown"""

    sl_operator.get(frontend_url(f'/storage/host/view/{host.id}'))
    wait_for_js(sl_operator)
    sl_operator.find_element(By.XPATH, '//div[contains(@class, "breadcrumb-buttons")]').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//div[contains(@class, "breadcrumb-buttons")]//h6[text()="More data"]'
    )))


def test_host_view_route_services_list_inrow_delete(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """host view tabbed services dt tests; render and inrow delete"""

    service_id = service.id
    db.session.expunge(service)

    get_host_view_tab(sl_operator, service.host_id, service)
    dt_inrow_delete(sl_operator, 'host_view_service_table', 1)

    assert not db.session.get(Service, service_id)


def test_host_view_route_services_list_service_endpoint_dropdown(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """host view tabbed services; SE dropdown"""

    get_host_view_tab(sl_operator, service.host_id, service)
    check_service_endpoint_dropdown(sl_operator, sl_operator.find_element(By.ID, 'host_view_service_table'), service.port)


def test_host_view_route_services_list_moredata_dropdown(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """host view tabbed services; moredata dropdown"""

    get_host_view_tab(sl_operator, service.host_id, service)

    sl_operator.find_element(By.ID, 'host_view_service_table').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//table[@id="host_view_service_table"]//h6[text()="More data"]'
    )))


def test_host_view_route_services_list_selectrows(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """host view tabbed services dt test; selections"""

    get_host_view_tab(sl_operator, services_multiaction[0].host_id, services_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_select_rows(
        sl_operator,
        frontend_url(f'/storage/host/view/{services_multiaction[0].host_id}'),
        'host_view_service_table',
        load_route=False
    )


def test_host_view_route_services_list_multiactions(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """host view tabbed services dt test; multiactions"""

    get_host_view_tab(sl_operator, services_multiaction[0].host_id, services_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_multiactions(sl_operator, frontend_url(f'/storage/host/view/{services_multiaction[0].host_id}'),
                                  'host_view_service_table', Service, load_route=False)


def test_host_view_route_services_list_freetag(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """host view tabbed services dt test; freetag"""

    get_host_view_tab(sl_operator, services_multiaction[0].host_id, services_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_freetag(sl_operator, frontend_url(f'/storage/host/view/{services_multiaction[0].host_id}'),
                             'host_view_service_table', Service, load_route=False)


def test_host_view_route_vulns_list_inrow_delete(frontend_server, sl_operator, vuln):  # pylint: disable=unused-argument
    """host view tabbed vulns dt test; render and inrow delete"""

    vuln_id = vuln.id
    db.session.expunge(vuln)

    get_host_view_tab(sl_operator, vuln.host_id, vuln)
    dt_inrow_delete(sl_operator, 'host_view_vuln_table', 1)

    assert not db.session.get(Vuln, vuln_id)


def test_host_view_route_vulns_list_service_endpoint_dropdown(frontend_server, sl_operator, vuln_factory, service):  # pylint: disable=unused-argument
    """host view tabbed vulns; SE dropdown"""

    test_vuln = vuln_factory.create(service=service)

    get_host_view_tab(sl_operator, test_vuln.host_id, test_vuln)
    check_service_endpoint_dropdown(
        sl_operator,
        sl_operator.find_element(By.ID, 'host_view_vuln_table'),
        f'{test_vuln.service.port}/{test_vuln.service.proto}'
    )


def test_host_view_route_vulns_list_moredata_dropdown(frontend_server, sl_operator, vuln):  # pylint: disable=unused-argument
    """host view tabbed vulns; moredata dropdown"""

    get_host_view_tab(sl_operator, vuln.host_id, vuln)

    sl_operator.find_element(By.ID, 'host_view_vuln_table').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//table[@id="host_view_vuln_table"]//h6[text()="More data"]'
    )))


def test_host_view_route_vulns_list_selectrows(frontend_server, sl_operator, vulns_multiaction):  # pylint: disable=unused-argument
    """host view tabbed vulns dt test; selections"""

    get_host_view_tab(sl_operator, vulns_multiaction[0].host_id, vulns_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_select_rows(
        sl_operator,
        frontend_url(f'/storage/host/view/{vulns_multiaction[0].host_id}'),
        'host_view_vuln_table',
        load_route=False
    )


def test_host_view_route_vulns_list_multiactions(frontend_server, sl_operator, vulns_multiaction):  # pylint: disable=unused-argument
    """host view tabbed vulns dt test; multiactions"""

    get_host_view_tab(sl_operator, vulns_multiaction[0].host_id, vulns_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_multiactions(sl_operator, frontend_url(f'/storage/host/view/{vulns_multiaction[0].host_id}'),
                                  'host_view_vuln_table', Vuln, load_route=False)


def test_host_view_route_vulns_list_freetag(frontend_server, sl_operator, vulns_multiaction):  # pylint: disable=unused-argument
    """host view tabbed vulns dt test; freetag"""

    get_host_view_tab(sl_operator, vulns_multiaction[0].host_id, vulns_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_freetag(sl_operator, frontend_url(f'/storage/host/view/{vulns_multiaction[0].host_id}'),
                             'host_view_vuln_table', Vuln, load_route=False)


def test_host_view_route_notes_list_inrow_delete(frontend_server, sl_operator, note):  # pylint: disable=unused-argument
    """host view tabbed notes dt test; render and inrow delete"""

    note_id = note.id
    db.session.expunge(note)

    get_host_view_tab(sl_operator, note.host_id, note)
    dt_inrow_delete(sl_operator, 'host_view_note_table', 1)

    assert not db.session.get(Note, note_id)


def test_host_view_route_notes_list_service_endpoint_dropdown(frontend_server, sl_operator, note_factory, service):  # pylint: disable=unused-argument
    """host view tabbed notes; SE dropdown"""

    test_note = note_factory.create(service=service)

    get_host_view_tab(sl_operator, test_note.host_id, test_note)
    check_service_endpoint_dropdown(
        sl_operator,
        sl_operator.find_element(By.ID, 'host_view_note_table'),
        f'{test_note.service.port}/{test_note.service.proto}'
    )


def test_host_view_route_notes_list_moredata_dropdown(frontend_server, sl_operator, note):  # pylint: disable=unused-argument
    """host view tabbed notes; moredata dropdown"""

    get_host_view_tab(sl_operator, note.host_id, note)
    sl_operator.find_element(By.ID, 'host_view_note_table').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//table[@id="host_view_note_table"]//h6[text()="More data"]'
    )))


def test_host_view_route_notes_list_selectrows(frontend_server, sl_operator, notes_multiaction):  # pylint: disable=unused-argument
    """host view tabbed notes dt test; selections"""

    get_host_view_tab(sl_operator, notes_multiaction[0].host_id, notes_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_select_rows(
        sl_operator,
        frontend_url(f'/storage/host/view/{notes_multiaction[0].host_id}'),
        'host_view_note_table',
        load_route=False
    )


def test_host_view_route_notes_list_multiactions(frontend_server, sl_operator, notes_multiaction):  # pylint: disable=unused-argument
    """host view tabbed notes dt test; multiactions"""

    get_host_view_tab(sl_operator, notes_multiaction[0].host_id, notes_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_multiactions(sl_operator, frontend_url(f'/storage/host/view/{notes_multiaction[0].host_id}'),
                                  'host_view_note_table', Note, load_route=False)


def test_host_view_route_notes_list_freetag(frontend_server, sl_operator, notes_multiaction):  # pylint: disable=unused-argument
    """host view tabbed notes dt test; freetag"""

    get_host_view_tab(sl_operator, notes_multiaction[0].host_id, notes_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_freetag(sl_operator, frontend_url(f'/storage/host/view/{notes_multiaction[0].host_id}'),
                             'host_view_note_table', Note, load_route=False)


def test_host_view_route_versioninfo_list(frontend_server, sl_operator, versioninfo):  # pylint: disable=unused-argument
    """host view tabbed versioninfo"""

    get_host_view_tab(sl_operator, versioninfo.host_id, versioninfo, 'product')


def test_host_view_route_versioninfo_list_selectrows(frontend_server, sl_operator, versioninfo_multiaction):  # pylint: disable=unused-argument
    """host view tabbed versioninfo dt test; selections"""

    get_host_view_tab(sl_operator, versioninfo_multiaction[0].host_id, versioninfo_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_select_rows(
        sl_operator,
        frontend_url(f'/storage/host/view/{versioninfo_multiaction[0].host_id}'),
        'host_view_versioninfo_table',
        load_route=False
    )


def test_host_view_route_versioninfo_list_multiactions(frontend_server, sl_operator, versioninfo_multiaction):  # pylint: disable=unused-argument
    """host view tabbed versioninfo dt test; multiactions"""

    get_host_view_tab(sl_operator, versioninfo_multiaction[0].host_id, versioninfo_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_multiactions(sl_operator, frontend_url(f'/storage/host/view/{versioninfo_multiaction[0].host_id}'),
                                  'host_view_versioninfo_table', Versioninfo, load_route=False, test_delete=False)


def test_host_view_route_versioninfo_list_freetag(frontend_server, sl_operator, versioninfo_multiaction):  # pylint: disable=unused-argument
    """host view tabbed versioninfo dt test; freetag"""

    get_host_view_tab(sl_operator, versioninfo_multiaction[0].host_id, versioninfo_multiaction[-1])
    toggle_dt_toolboxes(sl_operator)
    wait_for_js(sl_operator)
    check_dt_toolbox_freetag(sl_operator, frontend_url(f'/storage/host/view/{versioninfo_multiaction[0].host_id}'),
                             'host_view_versioninfo_table', Versioninfo, load_route=False)
